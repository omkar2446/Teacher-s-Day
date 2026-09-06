from datetime import date
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError
from flask import Flask
from app.config import Config
from app.extensions import cors, db, jwt, migrate
from app.models import Card, Event, Teacher, User

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    db.init_app(app); migrate.init_app(app, db); jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': app.config['FRONTEND_URL']}})
    from app.routes import api
    app.register_blueprint(api, url_prefix='/api')
    with app.app_context():
        db.create_all()
        ensure_photo_position_column()
        seed_data(app)
    return app

def seed_data(app):
    event = Event.query.first()
    if not event:
        event = Event(title="Teacher's Day Celebration", event_date=date(2026, 9, 8), venue='Red Seminar Hall', description="A special Teacher's Day celebration.")
        db.session.add(event)
    admin = User.query.filter_by(email=app.config['ADMIN_EMAIL']).first()
    if not admin:
        admin = User(email=app.config['ADMIN_EMAIL']); admin.set_password(app.config['ADMIN_PASSWORD']); db.session.add(admin)
    db.session.flush()
    for index in range(1, 9):
        slug = f'teacher-{index:03d}'
        if not Card.query.filter_by(slug=slug).first():
            teacher = Teacher(name=f'Teacher {index}', personal_message='Thank you for guiding us with patience, courage, and care.')
            db.session.add(teacher); db.session.flush(); db.session.add(Card(teacher_id=teacher.id, event_id=event.id, slug=slug))
    db.session.commit()

def ensure_photo_position_column():
    if 'photo_position' not in {column['name'] for column in inspect(db.engine).get_columns('teacher')}:
        try:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE teacher ADD COLUMN photo_position VARCHAR(30) NOT NULL DEFAULT '50% 50%'"))
        except OperationalError as error:
            if 'duplicate column' not in str(error).lower():
                raise
