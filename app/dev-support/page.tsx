'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Loading from '@/app/loading'
import dayjs from 'dayjs'
import {
  Send,
  Bug,
  Lightbulb,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Trash2,
  Edit,
  X,
  Paperclip,
  Image as ImageIcon,
  ClipboardPaste
} from 'lucide-react'
import clsx from 'classnames'

type FeedbackItem = {
  id: string
  message: string
  type: 'bug' | 'recommendation' | 'other'
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'resolved'
  reply: string | null
  reply_at: string | null
  screenshot_url: string | null
  created_at: string
}

export default function DevSupportPage() {
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])

  // Form State
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'bug' | 'recommendation' | 'other'>('other')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) setUserEmail(session.user.email || 'Librarian')
        fetchFeedbacks()
    }
    init()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (editingId) return

      const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
        item.type.startsWith('image/')
      )
      const pastedFile = imageItem?.getAsFile()

      if (!pastedFile) return

      event.preventDefault()
      setScreenshotFile(
        new File([pastedFile], `pasted-screenshot-${Date.now()}.${getImageExtension(pastedFile.type)}`, {
          type: pastedFile.type,
        })
      )
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [editingId])

  const fetchFeedbacks = async () => {
    setLoading(true)
    const { data, error } = await supabase
        .from('developer_feedback')
        .select('*')
        .order('created_at', { ascending: false })

    if (data) setFeedbacks(data as FeedbackItem[])
    setLoading(false)
  }

  const getImageExtension = (mimeType: string) => {
    const subtype = mimeType.split('/')[1] || 'png'
    return subtype === 'jpeg' ? 'jpg' : subtype
  }

  const setScreenshotFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please attach an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Please select an image under 5MB.")
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('feedback_screenshots')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('feedback_screenshots').getPublicUrl(filePath);
    return data.publicUrl;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    let screenshotUrl = null;

    // Upload image if selected
    if (selectedFile) {
        screenshotUrl = await uploadImage(selectedFile);
        if (!screenshotUrl) {
            alert('Failed to upload image. Please try again.');
            setSubmitting(false);
            return;
        }
    }

    if (editingId) {
        // Update existing ticket (Note: We are not updating image on edit for simplicity)
        const { error } = await supabase.from('developer_feedback').update({
            message,
            type,
            priority
        }).eq('id', editingId)

        if (error) alert('Failed to update ticket.')
        else {
            handleCancelEdit();
            fetchFeedbacks();
        }
    } else {
        // Create new ticket
        const { error } = await supabase.from('developer_feedback').insert({
            message,
            type,
            priority,
            submitted_by: userEmail,
            status: 'pending',
            screenshot_url: screenshotUrl // Save the URL
        })

        if (error) alert('Failed to send feedback.')
        else {
            setMessage('')
            removeFile();
            fetchFeedbacks()
        }
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
      const confirm = window.confirm("Are you sure you want to delete this ticket?");
      if (!confirm) return;

      const { error } = await supabase.from('developer_feedback').delete().eq('id', id);
      if (error) {
          alert('Failed to delete ticket.');
      } else {
          setFeedbacks(prev => prev.filter(f => f.id !== id));
          if (editingId === id) handleCancelEdit();
      }
  }

  const handleStartEdit = (item: FeedbackItem) => {
      setEditingId(item.id);
      setMessage(item.message);
      setType(item.type);
      setPriority(item.priority);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
      setEditingId(null);
      setMessage('');
      setType('other');
      setPriority('medium');
      removeFile(); // Clear file input on cancel
  }

  if (loading) return <Loading />

  return (
    <div className="min-h-screen bg-primary-grey pt-24 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading-text-black uppercase tracking-wider">
              System Support
            </h1>
            <p className="text-text-grey mt-1">Report bugs, suggest features, or contact the developer directly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* --- LEFT COLUMN: Submission Form --- */}
            <div className="lg:col-span-1">
                <div className={clsx("border rounded-xl shadow-lg p-6 sticky top-24 transition-colors duration-300", editingId ? "bg-blue-50 border-blue-200" : "bg-secondary-white border-primary-dark-grey")}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-heading-text-black flex items-center gap-2">
                            {editingId ? <Edit size={20} className="text-blue-600"/> : <Send size={20} className="text-dark-green"/>}
                            {editingId ? 'Edit Ticket' : 'New Ticket'}
                        </h2>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-text-grey hover:text-red-500" title="Cancel Edit">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-grey mb-1">Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => setType('bug')} className={clsx("py-2 rounded-lg text-xs font-bold transition border", type === 'bug' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-primary-grey border-transparent text-text-grey')}>Bug</button>
                                <button type="button" onClick={() => setType('recommendation')} className={clsx("py-2 rounded-lg text-xs font-bold transition border", type === 'recommendation' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-primary-grey border-transparent text-text-grey')}>Feature</button>
                                <button type="button" onClick={() => setType('other')} className={clsx("py-2 rounded-lg text-xs font-bold transition border", type === 'other' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-primary-grey border-transparent text-text-grey')}>Other</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-grey mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full p-2 rounded-lg bg-primary-grey border border-primary-dark-grey text-sm focus:ring-2 focus:ring-dark-green outline-none"
                            >
                                <option value="low">Low - It's a minor thing</option>
                                <option value="medium">Medium - Normal request</option>
                                <option value="high">High - Something is broken</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-grey mb-1">Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe the issue or idea..."
                                className="w-full p-3 h-40 rounded-lg bg-primary-grey border border-primary-dark-grey text-sm focus:ring-2 focus:ring-dark-green outline-none resize-none"
                                required
                            />
                        </div>

                        {/* --- File Upload Section --- */}
                        {!editingId && (
                            <div>
                                <label className="block text-sm font-semibold text-text-grey mb-2">Screenshot</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {!selectedFile ? (
                                    <div className="rounded-xl border border-dashed border-primary-dark-grey bg-primary-grey p-4">
                                        <div className="flex items-start gap-3">
                                            <ClipboardPaste size={18} className="mt-0.5 shrink-0 text-dark-green" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-heading-text-black">
                                                    Paste a screenshot here with Ctrl+V
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-text-grey">
                                                    You can also choose an image file from your device.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary-dark-grey bg-white px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-secondary-white hover:text-blue-800"
                                                >
                                                    <Paperclip size={16} /> Select File
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative mt-2 inline-block">
                                        <img src={previewUrl!} alt="Preview" className="h-20 w-auto rounded-lg border border-primary-dark-grey shadow-sm" />
                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 py-3 bg-gray-200 text-text-grey font-bold rounded-lg hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={submitting}
                                className={clsx("flex-1 py-3 font-bold rounded-lg transition disabled:opacity-70 flex justify-center items-center gap-2", editingId ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-button-yellow text-button-text-black hover:bg-yellow-500")}
                            >
                                {submitting ? 'Sending...' : (editingId ? 'Update Ticket' : <>Submit Ticket <Send size={16}/></>)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- RIGHT COLUMN: History Feed --- */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-heading-text-black flex items-center gap-2">
                    <Clock size={20} className="text-text-grey"/> Ticket History
                </h2>

                {feedbacks.length === 0 ? (
                    <div className="text-center py-12 bg-secondary-white border border-primary-dark-grey rounded-xl">
                        <p className="text-text-grey">No tickets submitted yet.</p>
                    </div>
                ) : (
                    feedbacks.map(item => (
                        <div key={item.id} className="bg-secondary-white border border-primary-dark-grey rounded-xl p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    {item.type === 'bug' && <span className="bg-red-100 text-red-700 p-2 rounded-lg"><Bug size={18}/></span>}
                                    {item.type === 'recommendation' && <span className="bg-blue-100 text-blue-700 p-2 rounded-lg"><Lightbulb size={18}/></span>}
                                    {item.type === 'other' && <span className="bg-gray-100 text-gray-700 p-2 rounded-lg"><MessageSquare size={18}/></span>}

                                    <div>
                                        <span className={clsx("text-xs font-bold uppercase px-2 py-0.5 rounded-full",
                                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                            item.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                            'bg-green-100 text-green-800'
                                        )}>
                                            {item.priority} Priority
                                        </span>
                                        <p className="text-xs text-text-grey mt-1">{dayjs(item.created_at).format('DD MMM YYYY, h:mm A')}</p>
                                    </div>
                                </div>
                                {/* Status and Actions */}
                                <div className="flex items-center gap-2">
                                    {item.status === 'resolved' ? (
                                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                            <CheckCircle2 size={16} /> <span className="text-xs font-bold">Resolved</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                                            <AlertCircle size={16} /> <span className="text-xs font-bold">Pending</span>
                                        </div>
                                    )}
                                    <div className="flex gap-1 ml-2">
                                        <button onClick={() => handleStartEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit Ticket"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition" title="Delete Ticket"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary-grey p-3 rounded-lg text-sm text-heading-text-black whitespace-pre-wrap border border-primary-dark-grey">
                                {item.message}
                            </div>

                            {/* Display Screenshot if available */}
                            {item.screenshot_url && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-text-grey mb-1 flex items-center gap-1"><ImageIcon size={12}/> Screenshot Attached</p>
                                    <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer">
                                        <img src={item.screenshot_url} alt="Screenshot" className="max-h-40 rounded-lg border border-primary-dark-grey hover:opacity-90 transition cursor-zoom-in" />
                                    </a>
                                </div>
                            )}

                            {item.reply && (
                                <div className="mt-4 pl-4 border-l-4 border-dark-green ml-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-dark-green" />
                                        <span className="text-xs font-bold text-dark-green">Developer Response</span>
                                        <span className="text-xs text-text-grey">• {dayjs(item.reply_at).format('DD MMM, h:mm A')}</span>
                                    </div>
                                    <p className="text-sm text-heading-text-black bg-green-50 p-3 rounded-r-lg rounded-bl-lg">
                                        {item.reply}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
