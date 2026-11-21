import logging
from sqlalchemy import text, inspect
from datetime import datetime, timezone
from backend.database import engine, SessionLocal
from backend.models.cctv import CCTVCamera

logger = logging.getLogger("darshanai.camera_migration")

def migrate_and_seed_cameras():
    """
    Applies safe database schema migrations for CCTV cameras
    and seeds authoritative camera-to-zone spatial mappings for all 4 temples.
    """
    inspector = inspect(engine)
    existing_cols = [c["name"] for c in inspector.get_columns("cctv_cameras")]

    # New columns to ensure present
    new_cols = [
        ("latitude", "FLOAT"),
        ("longitude", "FLOAT"),
        ("orientation_deg", "FLOAT DEFAULT 0.0"),
        ("fov_deg", "FLOAT DEFAULT 75.0"),
        ("coverage_area_sqm", "FLOAT DEFAULT 350.0"),
        ("coverage_polygon", "JSON"),
        ("is_authorized", "BOOLEAN DEFAULT 1"),
        ("calibration_status", "VARCHAR(30) DEFAULT 'CALIBRATED'"),
        ("calibration_metadata", "JSON"),
        ("last_observation_time", "DATETIME"),
        ("last_person_count", "INTEGER DEFAULT 0"),
        ("last_density_level", "VARCHAR(30) DEFAULT 'LOW'")
    ]

    with engine.begin() as conn:
        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE cctv_cameras ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"Added column {col_name} to cctv_cameras")
                except Exception as e:
                    logger.warning(f"Column {col_name} add warning: {e}")

    # Seed authoritative camera records mapped to GIS zones
    db = SessionLocal()
    try:
        authoritative_cameras = [
            # -----------------------------------------------------------------
            # SOMNATH TEMPLE (TEMPLE-001) - Gir Somnath, Gujarat
            # Center: 20.88805 N, 70.40125 E
            # -----------------------------------------------------------------
            {
                "camera_id": "CAM-101",
                "temple_id": "TEMPLE-001",
                "name": "Digvijay Mahadwar Main Ingress Portal",
                "zone_code": "main_entrance",
                "latitude": 20.88880,
                "longitude": 70.40050,
                "orientation_deg": 180.0, # South-facing entrance
                "fov_deg": 85.0,
                "coverage_area_sqm": 420.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-101/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 24.5, "tilt_angle_deg": 35.0, "focal_length_mm": 4.0},
                "last_person_count": 34,
                "last_density_level": "NORMAL"
            },
            {
                "camera_id": "CAM-102",
                "temple_id": "TEMPLE-001",
                "name": "Sabha & Nritya Mandap Queue Complex",
                "zone_code": "queue_area",
                "latitude": 20.88812,
                "longitude": 70.40105,
                "orientation_deg": 90.0, # East-facing toward Sanctum
                "fov_deg": 75.0,
                "coverage_area_sqm": 550.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-102/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 28.0, "tilt_angle_deg": 40.0, "focal_length_mm": 6.0},
                "last_person_count": 68,
                "last_density_level": "MODERATE"
            },
            {
                "camera_id": "CAM-103",
                "temple_id": "TEMPLE-001",
                "name": "Garbagriha Jyotirlinga Sanctum Corridor",
                "zone_code": "darshan_hall",
                "latitude": 20.88805,
                "longitude": 70.40125,
                "orientation_deg": 0.0, # North-facing sanctum queue
                "fov_deg": 65.0,
                "coverage_area_sqm": 280.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-103/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 32.0, "tilt_angle_deg": 45.0, "focal_length_mm": 8.0},
                "last_person_count": 42,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-104",
                "temple_id": "TEMPLE-001",
                "name": "Arabian Sea Coastal Promenade Egress",
                "zone_code": "exit_gates",
                "latitude": 20.88750,
                "longitude": 70.40150,
                "orientation_deg": 270.0, # West-facing seaside walk
                "fov_deg": 90.0,
                "coverage_area_sqm": 600.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-104/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 20.0, "tilt_angle_deg": 30.0, "focal_length_mm": 3.6},
                "last_person_count": 28,
                "last_density_level": "NORMAL"
            },

            # -----------------------------------------------------------------
            # TIRUMALA TIRUPATI DEVASTHANAMS (TEMPLE-002) - Tirumala Hills
            # Center: 13.6833 N, 79.3472 E
            # -----------------------------------------------------------------
            {
                "camera_id": "CAM-201",
                "temple_id": "TEMPLE-002",
                "name": "Mahadwaram Padikavali Gopuram Entry Portal",
                "zone_code": "main_entrance",
                "latitude": 13.68310,
                "longitude": 79.34680,
                "orientation_deg": 90.0, # East-facing grand portal
                "fov_deg": 80.0,
                "coverage_area_sqm": 480.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-201/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 26.0, "tilt_angle_deg": 38.0, "focal_length_mm": 4.0},
                "last_person_count": 55,
                "last_density_level": "MODERATE"
            },
            {
                "camera_id": "CAM-202",
                "temple_id": "TEMPLE-002",
                "name": "Vaikuntam Queue Complex 1 Holding Spine",
                "zone_code": "queue_area",
                "latitude": 13.68380,
                "longitude": 79.34800,
                "orientation_deg": 220.0,
                "fov_deg": 70.0,
                "coverage_area_sqm": 850.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-202/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 30.0, "tilt_angle_deg": 42.0, "focal_length_mm": 6.0},
                "last_person_count": 145,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-203",
                "temple_id": "TEMPLE-002",
                "name": "Ananda Nilayam Golden Vimana Inner Pradakshina",
                "zone_code": "darshan_hall",
                "latitude": 13.68330,
                "longitude": 79.34720,
                "orientation_deg": 0.0,
                "fov_deg": 60.0,
                "coverage_area_sqm": 320.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-203/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 35.0, "tilt_angle_deg": 45.0, "focal_length_mm": 8.0},
                "last_person_count": 82,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-204",
                "temple_id": "TEMPLE-002",
                "name": "Sri Srivari Laddu Prasadam Distribution Counters",
                "zone_code": "prasadam_area",
                "latitude": 13.68260,
                "longitude": 79.34790,
                "orientation_deg": 180.0,
                "fov_deg": 85.0,
                "coverage_area_sqm": 600.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-204/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 22.0, "tilt_angle_deg": 35.0, "focal_length_mm": 4.0},
                "last_person_count": 62,
                "last_density_level": "MODERATE"
            },

            # -----------------------------------------------------------------
            # MADURAI MEENAKSHI AMMAN TEMPLE (TEMPLE-003) - Madurai Central
            # Center: 9.9195 N, 78.1193 E
            # -----------------------------------------------------------------
            {
                "camera_id": "CAM-301",
                "temple_id": "TEMPLE-003",
                "name": "East Tower Kizhakku Gopuram Main Gateway",
                "zone_code": "main_entrance",
                "latitude": 9.91950,
                "longitude": 78.12150,
                "orientation_deg": 270.0, # West-facing entry into Ashta Shakthi
                "fov_deg": 80.0,
                "coverage_area_sqm": 500.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-301/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 25.0, "tilt_angle_deg": 36.0, "focal_length_mm": 4.0},
                "last_person_count": 48,
                "last_density_level": "MODERATE"
            },
            {
                "camera_id": "CAM-302",
                "temple_id": "TEMPLE-003",
                "name": "Ashta Shakthi & Meenakshi Naicker Mandapam Queue",
                "zone_code": "queue_area",
                "latitude": 9.91920,
                "longitude": 78.12050,
                "orientation_deg": 270.0,
                "fov_deg": 75.0,
                "coverage_area_sqm": 520.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-302/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 28.0, "tilt_angle_deg": 40.0, "focal_length_mm": 6.0},
                "last_person_count": 76,
                "last_density_level": "MODERATE"
            },
            {
                "camera_id": "CAM-303",
                "temple_id": "TEMPLE-003",
                "name": "Meenakshi Amman Garbagriha Sanctum Complex",
                "zone_code": "darshan_hall",
                "latitude": 9.91950,
                "longitude": 78.11930,
                "orientation_deg": 90.0,
                "fov_deg": 65.0,
                "coverage_area_sqm": 310.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-303/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 34.0, "tilt_angle_deg": 45.0, "focal_length_mm": 8.0},
                "last_person_count": 52,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-304",
                "temple_id": "TEMPLE-003",
                "name": "Aayiram Kaal Mandapam (Thousand Pillar Hall)",
                "zone_code": "prasadam_area",
                "latitude": 9.91900,
                "longitude": 78.12000,
                "orientation_deg": 0.0,
                "fov_deg": 90.0,
                "coverage_area_sqm": 900.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-304/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 20.0, "tilt_angle_deg": 30.0, "focal_length_mm": 3.6},
                "last_person_count": 35,
                "last_density_level": "NORMAL"
            },

            # -----------------------------------------------------------------
            # KASHI VISHWANATH CORRIDOR (TEMPLE-005) - Varanasi Old City
            # Center: 25.3109 N, 83.0107 E
            # -----------------------------------------------------------------
            {
                "camera_id": "CAM-501",
                "temple_id": "TEMPLE-005",
                "name": "Ganga Riverfront Lalita Ghat Ingress Gateway",
                "zone_code": "main_entrance",
                "latitude": 25.31050,
                "longitude": 83.01400,
                "orientation_deg": 270.0, # West-facing entry from Ghats
                "fov_deg": 85.0,
                "coverage_area_sqm": 650.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-501/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 22.0, "tilt_angle_deg": 34.0, "focal_length_mm": 4.0},
                "last_person_count": 64,
                "last_density_level": "MODERATE"
            },
            {
                "camera_id": "CAM-502",
                "temple_id": "TEMPLE-005",
                "name": "Mandir Chowk Central Grand Plaza Corridor",
                "zone_code": "queue_area",
                "latitude": 25.31120,
                "longitude": 83.01250,
                "orientation_deg": 180.0,
                "fov_deg": 90.0,
                "coverage_area_sqm": 1200.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-502/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 18.0, "tilt_angle_deg": 32.0, "focal_length_mm": 3.6},
                "last_person_count": 185,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-503",
                "temple_id": "TEMPLE-005",
                "name": "Kashi Vishwanath Jyotirlinga Sanctum Portal",
                "zone_code": "darshan_hall",
                "latitude": 25.31090,
                "longitude": 83.01070,
                "orientation_deg": 0.0,
                "fov_deg": 65.0,
                "coverage_area_sqm": 250.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-503/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 36.0, "tilt_angle_deg": 48.0, "focal_length_mm": 8.0},
                "last_person_count": 58,
                "last_density_level": "HIGH"
            },
            {
                "camera_id": "CAM-504",
                "temple_id": "TEMPLE-005",
                "name": "Lahori Tola Western Gate Inflow & Security",
                "zone_code": "exit_gates",
                "latitude": 25.30980,
                "longitude": 83.00980,
                "orientation_deg": 90.0,
                "fov_deg": 75.0,
                "coverage_area_sqm": 450.0,
                "source_type": "TEST_VIDEO",
                "stream_url": "/api/cctv/cameras/CAM-504/detection-stream",
                "status": "ONLINE",
                "is_authorized": True,
                "calibration_status": "CALIBRATED",
                "calibration_metadata": {"pixels_per_meter": 25.0, "tilt_angle_deg": 35.0, "focal_length_mm": 4.0},
                "last_person_count": 31,
                "last_density_level": "NORMAL"
            }
        ]

        existing_cams = {c.camera_id: c for c in db.query(CCTVCamera).all()}
        for cam_data in authoritative_cameras:
            c_id = cam_data["camera_id"]
            if c_id not in existing_cams:
                c = CCTVCamera(**cam_data)
                db.add(c)
            else:
                c = existing_cams[c_id]
                for k, v in cam_data.items():
                    setattr(c, k, v)
        db.commit()
        logger.info(f"Successfully seeded {len(authoritative_cameras)} authoritative GIS-mapped CCTV cameras across all 4 temples.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding cameras: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed_cameras()
