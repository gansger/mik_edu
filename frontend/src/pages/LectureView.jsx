import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { lectureFileUrl } from '../api';
import { api } from '../api';

export default function LectureView() {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [mdContent, setMdContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const url = `/api/files/lecture/${id}?token=${encodeURIComponent(token || '')}`;
    fetch(url, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Файл недоступен');
        const contentType = r.headers.get('Content-Type') || '';
        const disposition = r.headers.get('Content-Disposition') || '';
        if (contentType.includes('pdf')) {
          setLecture({ fileType: 'pdf', title: 'Лекция' });
          return r.blob().then((blob) => ({ blob, type: 'pdf' }));
        }
        if (contentType.includes('octet-stream') || disposition.includes('attachment')) {
          setLecture({ fileType: 'docx', title: 'Лекция', downloadUrl: url });
          return r.blob().then((blob) => ({ blob, type: 'docx' }));
        }
        return r.text().then((text) => {
          setLecture({ fileType: 'md', title: 'Лекция' });
          setMdContent(text);
          return { type: 'md' };
        });
      })
      .then((result) => {
        if (result?.type === 'pdf' && result?.blob) {
          setLecture((prev) => ({ ...prev, url: URL.createObjectURL(result.blob) }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="content">Загрузка лекции...</div>;
  if (error) return <div className="content"><p className="empty-state">{error}</p><Link to="/materials" className="btn btn-secondary">К материалам</Link></div>;

  return (
    <div className="lecture-view">
      <div className="lecture-view-header">
        <Link to="/materials" className="btn btn-secondary">← К материалам</Link>
      </div>
      <div className="lecture-view-content">
        {lecture?.fileType === 'pdf' && lecture?.url && (
          <iframe title="PDF" src={lecture.url} className="lecture-pdf" />
        )}
        {(lecture?.fileType === 'md' || mdContent != null) && (
          <div className="lecture-markdown card">
            <ReactMarkdown>{mdContent || ''}</ReactMarkdown>
          </div>
        )}
        {lecture?.fileType === 'docx' && (
          <div className="card">
            <p>Документ Word (DOCX). Откройте или сохраните файл.</p>
            <a href={lecture.downloadUrl || lectureFileUrl(id)} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Скачать / открыть файл</a>
          </div>
        )}
        {!lecture?.url && !mdContent && lecture?.fileType !== 'docx' && (
          <p className="empty-state">Просмотр этого типа файла в браузере не поддерживается. <a href={lectureFileUrl(id)} target="_blank" rel="noopener noreferrer">Скачать файл</a>.</p>
        )}
      </div>
    </div>
  );
}
