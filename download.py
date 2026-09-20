import urllib.request
import zipfile
import os
import sys

url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip"
wrapper_dir = os.path.dirname(os.path.abspath(__file__))
zip_path = os.path.join(wrapper_dir, "maven.zip")
maven_home = os.path.join(wrapper_dir, "apache-maven-3.9.6")
mvn_cmd = os.path.join(maven_home, "bin", "mvn.cmd")

if os.path.exists(mvn_cmd):
    sys.exit(0)

print("Downloading Apache Maven 3.9.6...")
try:
    urllib.request.urlretrieve(url, zip_path)
    print("Extracting Maven...")
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(wrapper_dir)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    print("Maven ready!")
except Exception as e:
    print(f"Error downloading Maven: {e}", file=sys.stderr)
    sys.exit(1)
