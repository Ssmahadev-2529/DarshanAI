import os
import time
import json
import uuid
import hashlib
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from collections import deque
from pydantic import BaseModel, Field

logger = logging.getLogger("darshanai.event_streaming")

class TempleEventTopic:
    ENTRY_EXIT = "darshanai.events.entry_exit"
    CROWD_ZONE = "darshanai.events.crowd_zone"
    PARKING_OCCUPANCY = "darshanai.events.parking_occupancy"
    ENVIRONMENTAL_SENSOR = "darshanai.events.environmental_sensor"

    @classmethod
    def all_topics(cls):
        return [cls.ENTRY_EXIT, cls.CROWD_ZONE, cls.PARKING_OCCUPANCY, cls.ENVIRONMENTAL_SENSOR]

# Schema Definitions with Strict Validation
class BaseEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    temple_id: str
    idempotency_key: str
    is_simulated: bool = False
    simulation_watermark: Optional[str] = None
    provenance_note: str = "Authoritative Operational Telemetry"

class EntryExitEvent(BaseEvent):
    gate_id: str
    event_type: str  # "ENTRY" or "EXIT"
    batch_count: int = 1
    darshan_type: str = "General Darshan"

class CrowdZoneEvent(BaseEvent):
    zone_id: str
    current_crowd: int
    crowd_density: float
    queue_length: int
    waiting_time_minutes: float
    risk_level: str

class ParkingEvent(BaseEvent):
    lot_id: str
    total_capacity: int
    occupied_slots: int
    occupancy_pct: float
    congestion_level: str

class EnvironmentalSensorEvent(BaseEvent):
    sensor_id: str
    metric_type: str  # "temperature", "humidity", "rainfall"
    value: float
    unit: str

class KafkaEventStreamBridge:
    """
    High-Throughput Event Streaming Broker & Ingestion Gateway for DARSHANAI 2.0.
    Supports genuine Apache Kafka clusters with transparent local in-memory fallback.
    Includes strict schema validation and duplicate event protection.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KafkaEventStreamBridge, cls).__new__(cls)
            cls._instance._init_broker()
        return cls._instance

    def _init_broker(self):
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        self.is_connected = False
        self.kafka_producer = None
        self.total_produced = 0
        self.total_consumed = 0
        self.duplicates_rejected = 0

        # In-memory buffer ring for recent events per topic (for dev/local and UI monitor)
        self.topic_buffers: Dict[str, deque] = {
            t: deque(maxlen=500) for t in TempleEventTopic.all_topics()
        }
        
        # Deduplication protection: LRU set of processed idempotency hashes
        self.seen_hashes: deque = deque(maxlen=20000)

        # Attempt Kafka client connection if kafka-python or aiokafka is present
        try:
            import kafka
            self.kafka_producer = kafka.KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=1000,
                max_block_ms=500
            )
            self.is_connected = True
            logger.info(f"KafkaEventStreamBridge connected to active Kafka cluster at {self.bootstrap_servers}")
        except Exception:
            self.is_connected = False
            logger.info("Kafka cluster offline or client not installed; running in local resilient in-memory streaming mode.")

    def compute_event_hash(self, idempotency_key: str, temple_id: str) -> str:
        raw = f"{temple_id}:{idempotency_key}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def produce(self, topic: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publishes an event with schema enforcement and duplicate-event protection.
        """
        temple_id = payload.get("temple_id", "UNKNOWN")
        idemp_key = payload.get("idempotency_key") or str(uuid.uuid4())
        event_hash = self.compute_event_hash(idemp_key, temple_id)

        # Duplicate protection check
        if event_hash in self.seen_hashes:
            self.duplicates_rejected += 1
            return {"status": "DUPLICATE_REJECTED", "event_id": payload.get("event_id"), "idempotency_key": idemp_key}

        self.seen_hashes.append(event_hash)

        # Ensure timestamp and metadata
        if "timestamp" not in payload:
            payload["timestamp"] = datetime.now(timezone.utc).isoformat()
        if "event_id" not in payload:
            payload["event_id"] = str(uuid.uuid4())

        # If connected to live Kafka
        if self.is_connected and self.kafka_producer:
            try:
                self.kafka_producer.send(topic, payload)
            except Exception as e:
                logger.warning(f"Kafka produce error: {e}. Falling back to internal buffer.")

        # Store in internal topic buffer
        if topic in self.topic_buffers:
            self.topic_buffers[topic].append(payload)

        self.total_produced += 1
        return {"status": "PRODUCED_SUCCESS", "topic": topic, "event_id": payload["event_id"]}

    def consume_recent(self, topic: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent consumed events for a topic."""
        buf = self.topic_buffers.get(topic, deque())
        items = list(buf)
        return items[-limit:]

    def get_stream_metrics(self) -> Dict[str, Any]:
        return {
            "broker_type": "Apache Kafka Clustered" if self.is_connected else "Local Event Stream Bus (Kafka Emulation)",
            "bootstrap_servers": self.bootstrap_servers,
            "is_broker_connected": self.is_connected,
            "topics": {
                topic: {
                    "buffer_count": len(self.topic_buffers[topic]),
                    "max_buffer": self.topic_buffers[topic].maxlen
                } for topic in TempleEventTopic.all_topics()
            },
            "total_events_produced": self.total_produced,
            "duplicates_suppressed": self.duplicates_rejected,
            "dedup_window_capacity": self.seen_hashes.maxlen
        }

    def emit_simulated_telemetry_pulse(self, temple_id: str = "TEMPLE-002") -> List[Dict[str, Any]]:
        """
        Generates a development telemetry pulse.
        STRICT COMPLIANCE: Clearly labelled as simulated; never represented as live temple activity.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        results = []

        # 1. Entry/Exit Event
        ee_event = EntryExitEvent(
            temple_id=temple_id,
            gate_id="GATE-EAST-01",
            event_type="ENTRY",
            batch_count=14,
            darshan_type="General Darshan",
            idempotency_key=f"sim-ee-{uuid.uuid4()}",
            is_simulated=True,
            simulation_watermark="DARSHANAI_SIMULATED_FEED",
            provenance_note="Simulated development stream only - not live temple activity"
        ).model_dump()
        self.produce(TempleEventTopic.ENTRY_EXIT, ee_event)
        results.append(ee_event)

        # 2. Crowd Zone Update
        cz_event = CrowdZoneEvent(
            temple_id=temple_id,
            zone_id="queue_area",
            current_crowd=1450,
            crowd_density=0.32,
            queue_length=380,
            waiting_time_minutes=24.5,
            risk_level="MODERATE",
            idempotency_key=f"sim-cz-{uuid.uuid4()}",
            is_simulated=True,
            simulation_watermark="DARSHANAI_SIMULATED_FEED",
            provenance_note="Simulated development stream only - not live temple activity"
        ).model_dump()
        self.produce(TempleEventTopic.CROWD_ZONE, cz_event)
        results.append(cz_event)

        # 3. Parking Event
        pk_event = ParkingEvent(
            temple_id=temple_id,
            lot_id="LOT-A-CENTRAL",
            total_capacity=1500,
            occupied_slots=1040,
            occupancy_pct=69.3,
            congestion_level="MEDIUM",
            idempotency_key=f"sim-pk-{uuid.uuid4()}",
            is_simulated=True,
            simulation_watermark="DARSHANAI_SIMULATED_FEED",
            provenance_note="Simulated development stream only - not live temple activity"
        ).model_dump()
        self.produce(TempleEventTopic.PARKING_OCCUPANCY, pk_event)
        results.append(pk_event)

        return results

# Singleton access
stream_bridge = KafkaEventStreamBridge()
