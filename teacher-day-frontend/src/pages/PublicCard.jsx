import { useEffect, useState } from 'react'
import { Calendar, Heart, MapPin, Share2, Bell, RefreshCw } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { eventICS, getCard, recordScan } from '../services/api'

export default function PublicCard() {
  const { slug } = useParams(); const [card, setCard] = useState(null); const [error, setError] = useState(false); const [loading, setLoading] = useState(true); const [reminder, setReminder] = useState(false); const [typedMessage, setTypedMessage] = useState('')
  const load = () => { setLoading(true); getCard(slug).then(({ data }) => { setCard(data); return recordScan(slug, Intl.DateTimeFormat().resolvedOptions().timeZone) }).then(() => setLoading(false)).catch(() => { setError(true); setLoading(false) }) }
  useEffect(load, [slug])
  useEffect(() => {
    if (!card || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return undefined
    const timer = window.setTimeout(() => setReminder(true), 5000)
    return () => window.clearTimeout(timer)
  }, [card])
  useEffect(() => {
    if (!card) return undefined
    const message = card.personal_message || ''
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTypedMessage(message); return undefined }
    setTypedMessage('')
    let index = 0
    const timer = window.setInterval(() => { index += 1; setTypedMessage(message.slice(0, index)); if (index >= message.length) window.clearInterval(timer) }, 34)
    return () => window.clearInterval(timer)
  }, [card])
  const share = async () => { const url = window.location.href; if (navigator.share) await navigator.share({ title: "Teacher's Day Card", url }); else await navigator.clipboard?.writeText(url) }
  if (loading) return <main className="public-shell loading-screen"><div className="flower-mark">✿</div><p>Preparing something special...</p></main>
  if (error || !card) return <main className="public-shell error-screen"><div className="flower-mark">✿</div><h1>Oops! This card could not be found.</h1><p>Please check the QR code and try again.</p><button className="button button-dark" onClick={load}><RefreshCw size={16}/> Retry</button></main>
  return <main className="public-shell is-open">
    <section className="greeting-card" aria-live="polite">
      <div className="card-decoration decoration-top">❧</div><p className="eyebrow">With gratitude &amp; love</p>
      <div className="portrait-wrap"><div className="portrait-ring"><img src={card.photo_url || '/teacher-placeholder.svg'} alt={card.name} style={{ objectPosition: card.photo_position || '50% 50%' }}/></div></div>
      <h1>{card.name}</h1><div className="heart-divider">• <Heart size={14} fill="currentColor"/> •</div>
      <p className="personal-message">“{typedMessage}<span className="typing-cursor" aria-hidden="true">|</span>”</p>
      <div className="event-details"><span><Calendar size={16}/> {card.event.date_label}</span><span><MapPin size={16}/> {card.event.venue}</span></div>
      <p className="closing">Happy Teacher's Day <Heart size={14} fill="currentColor"/></p>
      <div className="card-actions"><button onClick={() => setReminder(true)}><Bell size={16}/> Set reminder</button><button onClick={share}><Share2 size={16}/> Share card</button></div>
    </section>
    {reminder && <div className="reminder-sheet" role="dialog"><button className="close-button" onClick={() => setReminder(false)} aria-label="Close">×</button><p className="eyebrow">Keep the date</p><h2>Teacher's Day Celebration</h2><p>8 September 2026 · Red Seminar Hall</p><a className="button button-dark" href={eventICS()} download="teachers-day.ics"><Calendar size={16}/> Download Calendar Event</a><a className="text-link" href={eventICS()} target="_blank" rel="noreferrer">Add to Calendar</a></div>}
  </main>
}
