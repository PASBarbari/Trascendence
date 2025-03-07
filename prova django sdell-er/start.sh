# copiare e incollare
python3 -m venv venv && \
source venv/bin/activate && \
pip install -r ./iam/requirements.txt && \
cd iam && \
python manage.py makemigrations && \
python manage.py migrate && \
python manage.py runserver
