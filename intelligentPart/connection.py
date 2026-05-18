import os

# try:
#     import mysql.connector as mysql_connector
# except ImportError:
#     try:
#         import pymysql as mysql_connector
#     except ImportError:
#         raise ImportError(
#             "No suitable MySQL driver found. Install mysql-connector-python or pymysql."
#         )
import mysql.connector as mysql_connector

from dotenv import load_dotenv

load_dotenv()


def get_db():
    return mysql_connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "las_db"),
        autocommit=False,
    )