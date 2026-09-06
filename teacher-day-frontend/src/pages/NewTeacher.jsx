import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { createTeacher, uploadPhoto } from '../services/api'

export default function NewTeacher() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', personal_message: '', photo_url: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Use a JPG, PNG, or WEBP photo under 5 MB.')
      return
    }
    setError('')
    setPhotoPreview(URL.createObjectURL(file))
    setStatus('Uploading photo...')
    try {
      const { data } = await uploadPhoto(file)
      setForm((current) => ({ ...current, photo_url: data.url }))
      setStatus('')
    } catch {
      setStatus('')
      setError('Unable to upload this photo.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setStatus('Adding teacher...')
    setError('')
    try {
      await createTeacher(form)
      navigate('/admin')
    } catch (requestError) {
      setStatus('')
      setError(requestError.response?.data?.error || 'Unable to add this teacher.')
    }
  }

  return <main className="admin-shell">
    <Link className="back-link" to="/admin"><ArrowLeft size={16}/> All cards</Link>
    <form className="admin-panel editor-panel" onSubmit={submit}>
      <p className="eyebrow">New teacher card</p>
      <h1>Add a teacher</h1>
      <p className="form-help">The event date and venue are added automatically.</p>
      {error && <div className="form-error">{error}</div>}
      <label>Teacher photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto}/></label>
      {photoPreview && <img className="photo-preview" src={photoPreview} alt="Selected teacher"/>}
      <label>Teacher name<input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
      <label>Personal message<textarea required maxLength="500" rows="5" value={form.personal_message} onChange={(event) => setForm({ ...form, personal_message: event.target.value })}/></label>
      <div className="readonly-fields"><span>Date<strong>8 September 2026</strong></span><span>Venue<strong>Red Seminar Hall</strong></span></div>
      <button className="button button-dark" disabled={Boolean(status)}><Plus size={16}/>{status || 'Add teacher'}</button>
    </form>
  </main>
}
