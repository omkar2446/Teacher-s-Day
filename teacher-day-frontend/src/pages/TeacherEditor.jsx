import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getTeacher, updateTeacher, uploadPhoto } from '../services/api'

export default function TeacherEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', personal_message: '', photo_url: '', photo_position: '50% 50%' })
  const [photoX, setPhotoX] = useState(50)
  const [photoY, setPhotoY] = useState(50)
  const [status, setStatus] = useState('')

  useEffect(() => {
    getTeacher(id).then(({ data }) => {
      const [x = 50, y = 50] = (data.photo_position || '50% 50%').split('%').map(Number)
      setForm(data)
      setPhotoX(x)
      setPhotoY(y)
    })
  }, [id])

  const updatePosition = (x, y) => setForm((current) => ({ ...current, photo_position: `${x}% ${y}%` }))
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setStatus('Use JPG, PNG, or WEBP under 5 MB.')
      return
    }
    setStatus('Uploading photo...')
    try {
      const { data } = await uploadPhoto(file)
      if (data.url) setForm((current) => ({ ...current, photo_url: data.url }))
      setStatus('')
    } catch {
      setStatus('Unable to upload this photo.')
    }
  }
  const save = async (event) => {
    event.preventDefault()
    setStatus('Saving card...')
    await updateTeacher(id, form)
    setStatus('Saved')
    setTimeout(() => navigate('/admin'), 400)
  }

  return <main className="admin-shell">
    <Link className="back-link" to="/admin"><ArrowLeft size={16}/> All cards</Link>
    <form className="admin-panel editor-panel" onSubmit={save}>
      <p className="eyebrow">Edit card</p>
      <h1>{form.name || 'Teacher card'}</h1>
      <label>Teacher photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto}/></label>
      {form.photo_url && <>
        <div className="photo-adjust-preview"><img src={form.photo_url} alt="Teacher preview" style={{ objectPosition: `${photoX}% ${photoY}%` }}/></div>
        <p className="form-help">Adjust photo framing</p>
        <label>Horizontal position<input type="range" min="0" max="100" value={photoX} onChange={(event) => { const value = event.target.value; setPhotoX(value); updatePosition(value, photoY) }}/></label>
        <label>Vertical position<input type="range" min="0" max="100" value={photoY} onChange={(event) => { const value = event.target.value; setPhotoY(value); updatePosition(photoX, value) }}/></label>
      </>}
      <label>Teacher name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
      <label>Personal message<textarea required maxLength="500" rows="5" value={form.personal_message} onChange={(event) => setForm({ ...form, personal_message: event.target.value })}/></label>
      <div className="readonly-fields"><span>Date<strong>8 September 2026</strong></span><span>Venue<strong>Red Seminar Hall</strong></span></div>
      <button className="button button-dark" disabled={status === 'Uploading photo...'}>{status || 'Save card'}</button>
    </form>
  </main>
}
