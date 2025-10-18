from flask import Flask, render_template, request, send_file
import random
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
from flask_sqlalchemy import SQLAlchemy
from io import BytesIO
import logging
import urllib.parse
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------- Database (Azure SQL) ---------------- #
# Replace these values with your Azure SQL credentials
server = 'p2pdatabase.database.windows.net'
database = 'azure_otp'
username = 'shubham'
password = 'Swati@1989'
driver = 'ODBC Driver 18 for SQL Server'

# URL-encode the password to handle special characters like '@'
password_encoded = urllib.parse.quote_plus(password)

# SQLAlchemy connection URI for Azure SQL
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mssql+pyodbc://{username}:{password_encoded}@{server}:1433/{database}"
    f"?driver={driver.replace(' ', '+')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ---------------- Model ---------------- #
class FileMetadata(db.Model):
    otp = db.Column(db.String(6), primary_key=True)
    filename = db.Column(db.String(255))
    container = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime)

# ---------------- Azure Blob ---------------- #
connection_string = "DefaultEndpointsProtocol=https;AccountName=p2pserver;AccountKey=R0IWNDqQnUsOPX91k+K3geWpyNvv6tkbfFBdVhKh5AzY+/wWnUSUjj8C7r8N2o+p3BGPm/ugArCq+AStA1ujOQ==;EndpointSuffix=core.windows.net"
container_name = "server1"
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
container_client = blob_service_client.get_container_client(container_name)

# ---------------- Scheduler ---------------- #
scheduler = BackgroundScheduler()
scheduler.start()

# ---------------- Cleanup Function ---------------- #
def cleanup_file(otp, filename, container):
    with app.app_context():
        try:
            blob_client = blob_service_client.get_blob_client(container=container, blob=filename)
            blob_client.delete_blob()
            logging.info(f"🗑️ Deleted blob: {filename}")

            metadata = FileMetadata.query.filter_by(otp=otp).first()
            if metadata:
                db.session.delete(metadata)
                db.session.commit()
                logging.info(f"🗑️ Deleted OTP {otp} and metadata")
        except Exception as e:
            logging.error(f"⚠️ Error during cleanup of OTP {otp}, file {filename}: {e}")

# ---------------- Helper: Download Blob ---------------- #
def gave_it_to_the_receiver(blob_name, container):
    try:
        blob_client = blob_service_client.get_blob_client(container=container, blob=blob_name)
        blob_data = blob_client.download_blob().readall()

        return send_file(
            BytesIO(blob_data),
            as_attachment=True,
            download_name=blob_name
        )
    except ResourceNotFoundError:
        return render_template("index.html", error="⚠️ File no longer exists on server.")

# ---------------- Routes ---------------- #
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/client1", methods=["POST"])
def take_file():
    file = request.files.get("user_file")
    if file:
        otp = f"{random.randint(0, 999999):06d}"
        created_at = datetime.now(timezone.utc)
        expiry = created_at + timedelta(minutes=2)

        try:
            blob_client = container_client.get_blob_client(file.filename)
            blob_client.upload_blob(file, overwrite=True)

            metadata = FileMetadata(
                otp=otp,
                filename=file.filename,
                created_at=created_at,
                container=container_name,
                expires_at=expiry
            )
            db.session.add(metadata)
            db.session.commit()

            scheduler.add_job(cleanup_file, "date", run_date=expiry, args=[otp, file.filename, container_name])

            return render_template("index.html", otp=otp, expiry=expiry)
        except Exception as e:
            logging.error(f"Upload error: {e}")
            return render_template("index.html", error=f"⚠️ Upload failed: {e}")

    return render_template("index.html", error="⚠️ No file uploaded!")

@app.route("/download", methods=["POST"])
def download():
    user_otp = request.form.get("otp")
    metadata = FileMetadata.query.filter_by(otp=user_otp).first()
    now_utc = datetime.now(timezone.utc)

    if metadata and metadata.expires_at.replace(tzinfo=timezone.utc) > now_utc:
        return gave_it_to_the_receiver(metadata.filename, metadata.container)
    else:
        return render_template("index.html", error="⚠️ Invalid OTP or file expired.")

# ---------------- Run ---------------- #
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    
    # Use a production WSGI server like gunicorn
    app.run(host='0.0.0.0', port=5000, debug=False)
