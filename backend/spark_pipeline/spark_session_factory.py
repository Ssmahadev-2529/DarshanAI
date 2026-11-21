import os
import sys
import logging

logger = logging.getLogger("darshanai.spark")

def get_spark_session(app_name="DarshanAI-BigData-Engine", memory="2g"):
    """
    Initializes and returns a tuned Apache SparkSession for DARSHANAI 2.0.
    Configured for high-throughput local distributed execution with Arrow acceleration.
    """
    os.environ["PYSPARK_PYTHON"] = sys.executable
    os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

    try:
        from pyspark.sql import SparkSession
        
        builder = SparkSession.builder \
            .appName(app_name) \
            .master("local[*]") \
            .config("spark.driver.memory", memory) \
            .config("spark.sql.shuffle.partitions", "4") \
            .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
            .config("spark.ui.enabled", "false") \
            .config("spark.driver.host", "localhost")
        
        spark = builder.getOrCreate()
        spark.sparkContext.setLogLevel("ERROR")
        return spark
    except Exception as e:
        logger.warning(f"Could not initialize PySpark session: {e}. Falling back to Pandas/PyArrow execution engine.")
        return None
