import io
import os
from uuid import uuid4
from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify, request, send_file, make_response
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
import qrcode
from PIL import Image
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Card, Event, Scan, Teacher, User

api = Blueprint('api', __name__)

def event_payload(event):
    return {'title': event.title, 'date': event.event_date.isoformat(), 'date_label': event.event_date.strftime('%-d %B %Y') if os.name != 'nt' else event.event_date.strftime('%d %B %Y').lstrip('0'), 'venue': event.venue, 'description': event.description}

def teacher_payload(teacher):
    card = teacher.card
    last = max(card.scans, key=lambda scan: scan.scanned_at) if card and card.scans else None
    return {'id': teacher.id, 'name': teacher.name, 'photo_url': teacher.photo_url, 'photo_position': teacher.photo_position, 'personal_message': teacher.personal_message, 'slug': card.slug if card else None, 'scan_count': len(card.scans) if card else 0, 'last_scan': last.scanned_at.isoformat() if last else None, 'last_scan_label': last.scanned_at.strftime('%d %b, %I:%M %p') if last else None}

def card_payload(card):
    return {'id': card.id, 'slug': card.slug, 'name': card.teacher.name, 'photo_url': card.teacher.photo_url, 'photo_position': card.teacher.photo_position, 'personal_message': card.teacher.personal_message, 'event': event_payload(card.event)}

@api.post('/auth/login')
def auth_login():
    data = request.get_json(silent=True) or {}; user = User.query.filter_by(email=data.get('email', '').strip().lower()).first()
    if not user or not user.check_password(data.get('password', '')): return jsonify({'error': 'Invalid credentials'}), 401
    return jsonify({'access_token': create_access_token(identity=str(user.id)), 'user': {'email': user.email}})

@api.post('/auth/logout')
def auth_logout(): return jsonify({'message': 'Logged out'})

@api.get('/auth/me')
@jwt_required()
def auth_me():
    user = User.query.get(int(get_jwt_identity())); return jsonify({'email': user.email})

@api.get('/cards/<slug>')
def public_card(slug):
    card = Card.query.filter_by(slug=slug).first()
    return (jsonify(card_payload(card)), 200) if card else (jsonify({'error': 'Card not found'}), 404)

@api.post('/cards/<slug>/scan')
def public_scan(slug):
    card = Card.query.filter_by(slug=slug).first()
    if not card: return jsonify({'error': 'Card not found'}), 404
    data = request.get_json(silent=True) or {}
    scan = Scan(card_id=card.id, timezone=data.get('timezone', 'UTC')[:100]); db.session.add(scan); db.session.commit()
    return jsonify({'recorded': True, 'scan_count': len(card.scans)}), 201

@api.get('/teachers')
@jwt_required()
def teachers(): return jsonify([teacher_payload(teacher) for teacher in Teacher.query.order_by(Teacher.id).all()])

@api.get('/teachers/<int:teacher_id>')
@jwt_required()
def get_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id); return jsonify(teacher_payload(teacher))

@api.put('/teachers/<int:teacher_id>')
@jwt_required()
def update_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id); data = request.get_json(silent=True) or {}
    name = str(data.get('name', teacher.name)).strip(); message = str(data.get('personal_message', teacher.personal_message)).strip()
    if not name or not message or len(message) > 500: return jsonify({'error': 'Name and message are required; message must be 500 characters or fewer.'}), 400
    teacher.name, teacher.personal_message = name, message
    if 'photo_url' in data: teacher.photo_url = data['photo_url']
    if 'photo_position' in data: teacher.photo_position = str(data['photo_position'])[:30]
    db.session.commit(); return jsonify(teacher_payload(teacher))

@api.post('/teachers')
@jwt_required()
def create_teacher():
    data = request.get_json(silent=True) or {}; name = str(data.get('name', '')).strip(); message = str(data.get('personal_message', '')).strip()
    if not name or not message or len(message) > 500: return jsonify({'error': 'Invalid teacher data'}), 400
    event = Event.query.first(); teacher = Teacher(name=name, personal_message=message, photo_url=data.get('photo_url')); db.session.add(teacher); db.session.flush()
    teacher.photo_position = str(data.get('photo_position', '50% 50%'))[:30]; card = Card(teacher_id=teacher.id, event_id=event.id, slug=f'teacher-{teacher.id:03d}'); db.session.add(card); db.session.commit(); return jsonify(teacher_payload(teacher)), 201

@api.delete('/teachers/<int:teacher_id>')
@jwt_required()
def delete_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id); db.session.delete(teacher); db.session.commit(); return jsonify({'deleted': True})

@api.get('/teachers/<int:teacher_id>/stats')
@jwt_required()
def teacher_stats(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id); return jsonify({'scan_count': len(teacher.card.scans), 'last_scan': max((s.scanned_at for s in teacher.card.scans), default=None)})

@api.get('/teachers/<int:teacher_id>/scans')
@jwt_required()
def teacher_scans(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id); return jsonify([{'scanned_at': s.scanned_at.isoformat(), 'timezone': s.timezone} for s in teacher.card.scans])

@api.get('/cards/<slug>/qr')
@jwt_required()
def card_qr(slug):
    card = Card.query.filter_by(slug=slug).first_or_404(); qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4); qr.add_data(f"{current_app.config['FRONTEND_URL']}/card/{slug}"); qr.make(fit=True); image = qr.make_image(fill_color='black', back_color='white'); output = io.BytesIO(); image.save(output, format='PNG'); output.seek(0); return send_file(output, mimetype='image/png', download_name=f'{slug}.png')

@api.post('/upload/photo')
@jwt_required()
def upload_photo():
    photo = request.files.get('photo')
    if not photo or photo.mimetype not in {'image/jpeg', 'image/png', 'image/webp'}: return jsonify({'error': 'Use JPG, PNG, or WEBP.'}), 400
    photo.seek(0, 2)
    if photo.tell() > 5 * 1024 * 1024: return jsonify({'error': 'Photo must be 5 MB or smaller.'}), 400
    photo.seek(0)
    try:
        image = Image.open(photo)
        image.verify()
        photo.seek(0)
    except Exception:
        return jsonify({'error': 'Unable to upload this photo.'}), 400
    try:
        if current_app.config.get('CLOUDINARY_CLOUD_NAME'):
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(
                cloud_name=current_app.config['CLOUDINARY_CLOUD_NAME'],
                api_key=current_app.config['CLOUDINARY_API_KEY'],
                api_secret=current_app.config['CLOUDINARY_API_SECRET'],
            )
            result = cloudinary.uploader.upload(photo, folder='teacher-day')
            return jsonify({'url': result['secure_url']})
    except Exception:
        current_app.logger.exception('Cloudinary upload failed; using local development storage.')

    upload_dir = os.path.join(current_app.static_folder, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    extension = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}[photo.mimetype]
    filename = f'{uuid4().hex}{extension}'
    safe_name = secure_filename(filename)
    photo.save(os.path.join(upload_dir, safe_name))
    return jsonify({'url': f"{request.host_url.rstrip('/')}/static/uploads/{safe_name}", 'storage': 'local'}), 201

@api.get('/events')
def events(): return jsonify([event_payload(event) for event in Event.query.all()])

@api.get('/events/teacher-day.ics')
def calendar_event():
    event = Event.query.first(); ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Teacher Day Cards//EN\r\nBEGIN:VEVENT\r\nUID:teacher-day-2026@teacher-day\r\nDTSTAMP:20260101T000000Z\r\nDTSTART;VALUE=DATE:20260908\r\nSUMMARY:Teacher’s Day Celebration\r\nLOCATION:Red Seminar Hall\r\nDESCRIPTION:A special Teacher’s Day celebration.\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'
    response = make_response(ics); response.headers['Content-Type'] = 'text/calendar; charset=utf-8'; response.headers['Content-Disposition'] = 'attachment; filename=teachers-day.ics'; return response
