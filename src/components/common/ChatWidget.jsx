import { useState, useRef, useEffect } from 'react';
import { Bot, Building2, X, SendHorizontal, Loader2, Check, Ban, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import {
  actionCardLabels,
  appendMessage,
  errorMessage,
  formatActionSummary,
  suggestionsForRole,
  validateQuestion,
  welcomeMessage,
} from '../../utils/chatMessages';

const renderMessageContent = (content) => {
  if (typeof content !== 'string') return content;
  const qrMatch = content.match(/(https:\/\/(?:qr\.sepay\.vn\/img|img\.vietqr\.io\/[^\s]+)[^\s]*)/i);
  if (qrMatch) {
    const qrUrl = qrMatch[1];
    const textPart = content.replace(qrUrl, '').trim();
    return (
      <div>
        {textPart && <div style={{ whiteSpace: 'pre-wrap' }}>{textPart}</div>}
        <div style={{ marginTop: 10, textAlign: 'center', background: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <img
            src={qrUrl}
            alt="Mã VietQR thanh toán"
            style={{ maxWidth: 170, height: 'auto', borderRadius: 6, display: 'inline-block' }}
          />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: 500 }}>
            Mã VietQR thanh toán nhanh (quét bằng app ngân hàng)
          </div>
        </div>
      </div>
    );
  }
  return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
};

/**
 * Widget trò chuyện với trợ lý ảo, hiển thị ở mọi trang đã đăng nhập.
 * Lịch sử chỉ giữ trong state (mất khi tải lại trang) — backend không lưu.
 * Khi bot đề xuất hành động (pendingAction), hiện thẻ xác nhận: chỉ gọi
 * POST /chat/execute sau khi người dùng bấm Xác nhận.
 */
const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [input, setInput] = useState('');
  // Lời chào mở đầu phụ thuộc vai trò; widget chỉ hiện khi đã đăng nhập
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: welcomeMessage(localStorage.getItem('role')) },
  ]);
  const listRef = useRef(null);

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const suggestions = suggestionsForRole(role);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending, executing, open]);

  const ask = async (question) => {
    const check = validateQuestion(question);
    if (!check.ok || sending) return;

    const history = appendMessage(messages, { role: 'user', content: check.value });
    setMessages(history);
    setInput('');
    setSending(true);
    try {
      // axios interceptor trả thẳng body -> response là { reply, pendingAction?, warning? }
      const data = await axiosInstance.post('/chat', { messages: history });
      setMessages(appendMessage(history, {
        role: 'assistant',
        content: data.reply,
        pendingAction: data.pendingAction || null,
        warning: data.warning || null,
      }));
    } catch (err) {
      setMessages(appendMessage(history, { role: 'assistant', content: errorMessage(err) }));
    } finally {
      setSending(false);
    }
  };

  // Người dùng bấm Xác nhận trên thẻ hành động (T2.16)
  const confirmAction = async (msgIndex, tool, params, actionId) => {
    if (executing) return;
    setExecuting(true);
    try {
      const data = await axiosInstance.post('/chat/execute', { tool, params, actionId });
      const isNeedsReadings = !!data?.needsFinalReadings;
      if (!isNeedsReadings) {
        // Báo các trang danh sách tải lại dữ liệu vừa bị chatbot thay đổi
        window.dispatchEvent(new CustomEvent('app:data-changed', { detail: { tool } }));
      }
      setMessages((prev) => {
        const updated = prev.map((m, i) => (
          i === msgIndex
            ? {
                ...m,
                pendingAction: null,
                actionStatus: isNeedsReadings ? 'warning' : 'done',
                actionResult: data.message,
              }
            : m
        ));
        // Đẩy câu tóm tắt kết quả vào lịch sử hội thoại để lượt hỏi tiếp theo AI nắm ngữ cảnh
        if (data?.message) {
          return appendMessage(updated, { role: 'assistant', content: data.message, isActionSummary: true });
        }
        return updated;
      });
    } catch (err) {
      const errText = errorMessage(err);
      setMessages((prev) => {
        const updated = prev.map((m, i) => (
          i === msgIndex ? { ...m, pendingAction: null, actionStatus: 'error', actionResult: errText } : m
        ));
        return appendMessage(updated, { role: 'assistant', content: errText, isActionSummary: true });
      });
    } finally {
      setExecuting(false);
    }
  };

  // Người dùng bấm Hủy
  const cancelAction = (msgIndex) => {
    setMessages((prev) => prev.map((m, i) => (
      i === msgIndex ? { ...m, pendingAction: null, actionStatus: 'cancelled' } : m
    )));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    ask(input);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" role="dialog" aria-label="Trợ lý ảo HomeSync" data-testid="chat-panel">
          <header className="chat-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                <img src="/favicon.png" alt="HomeSync Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="chat-panel-title" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                  Trợ lý HomeSync
                </span>
                <span style={{ fontSize: 11, color: '#CCFBF1', lineHeight: 1.2 }}>
                  Hỗ trợ trực tuyến 24/7
                </span>
              </div>
            </div>
            <button type="button" className="icon-btn" aria-label="Đóng trò chuyện" onClick={() => setOpen(false)}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="chat-messages" ref={listRef} data-testid="chat-messages">
            {messages.map((msg, i) => {
              if (msg.isActionSummary) return null;
              const labels = msg.pendingAction ? actionCardLabels(msg.pendingAction.tool) : null;
              const summary = msg.pendingAction ? formatActionSummary(msg.pendingAction.tool, msg.pendingAction.params) : [];
              return (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  {renderMessageContent(msg.content)}

                  {msg.warning && (
                    <div className="chat-action-result warning" role="status" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' }}>
                      <AlertTriangle size={14} aria-hidden="true" /> {msg.warning}
                    </div>
                  )}

                  {/* Thẻ xác nhận hành động — chỉ render tool đã biết */}
                  {msg.pendingAction && labels && (
                    <div className="chat-action-card" data-testid="chat-action-card" role="group" aria-label={labels.title}>
                      <div className="chat-action-title">{labels.title}</div>
                      <dl className="chat-action-rows">
                        {summary.map((row) => (
                          <div key={row.label} className="chat-action-row">
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="chat-action-buttons">
                        <button
                          type="button"
                          className="chat-action-confirm"
                          data-testid="chat-action-confirm"
                          disabled={executing}
                          onClick={() => confirmAction(i, msg.pendingAction.tool, msg.pendingAction.params, msg.pendingAction.actionId)}
                        >
                          {executing
                            ? <><Loader2 size={14} className="spin" aria-hidden="true" /> Đang thực hiện...</>
                            : <><Check size={14} aria-hidden="true" /> Xác nhận</>}
                        </button>
                        <button
                          type="button"
                          className="chat-action-cancel"
                          data-testid="chat-action-cancel"
                          disabled={executing}
                          onClick={() => cancelAction(i)}
                        >
                          <Ban size={14} aria-hidden="true" /> Hủy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kết quả sau khi xác nhận / hủy */}
                  {msg.actionStatus === 'done' && (
                    <div className="chat-action-result ok" role="status">
                      <CheckCircle2 size={14} aria-hidden="true" /> {msg.actionResult}
                    </div>
                  )}
                  {msg.actionStatus === 'warning' && (
                    <div
                      className="chat-action-result warning"
                      role="status"
                      style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 10px', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}
                    >
                      <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{msg.actionResult}</span>
                    </div>
                  )}
                  {msg.actionStatus === 'error' && (
                    <div className="chat-action-result error" role="alert">
                      <AlertCircle size={14} aria-hidden="true" /> {msg.actionResult}
                    </div>
                  )}
                  {msg.actionStatus === 'cancelled' && (
                    <div className="chat-action-result muted" role="status">Đã hủy hành động.</div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="chat-msg assistant chat-typing" aria-live="polite">
                <Loader2 size={14} className="spin" aria-hidden="true" /> Đang soạn...
              </div>
            )}
            {/* Gợi ý chỉ hiện khi chưa có hội thoại thật */}
            {messages.length === 1 && !sending && (
              <div className="chat-suggestions">
                {suggestions.map((text) => (
                  <button key={text} type="button" className="chat-suggestion" onClick={() => ask(text)}>
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="chat-input">Nhập câu hỏi cho trợ lý</label>
            <input
              id="chat-input"
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Nhập câu hỏi..."
              autoComplete="off"
              maxLength={1000}
            />
            <button
              type="submit"
              className="chat-send"
              aria-label="Gửi câu hỏi"
              data-testid="chat-send"
              disabled={sending || !input.trim()}
            >
              <SendHorizontal size={17} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-launcher"
        aria-label={open ? 'Đóng trợ lý ảo' : 'Mở trợ lý ảo'}
        aria-expanded={open}
        data-testid="chat-launcher"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={24} aria-hidden="true" /> : <Bot size={24} aria-hidden="true" />}
      </button>
    </div>
  );
};

export default ChatWidget;
