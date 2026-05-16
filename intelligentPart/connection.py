import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_db():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "las_db"),
        autocommit=False,
    )