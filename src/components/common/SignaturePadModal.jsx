import { useRef, useState, useEffect } from 'react';
import { Modal, Button, Checkbox, message } from 'antd';
import { Eraser, Check, FileSignature } from 'lucide-react';

const MIN_DRAW_POINTS = 5;

const SignaturePadModal = ({ open, onCancel, onConfirm, title = "Vẽ chữ ký điện tử", loading = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) {
      setHasDrawn(false);
      setDrawPoints(0);
      setAgreed(false);
      // Wait for modal DOM render
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#0f172a'; // Deep slate ink color
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 100);
    }
  }, [open]);

  const getCanvasPoint = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasPoint(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setDrawPoints((prev) => {
      const next = prev + 1;
      if (next >= MIN_DRAW_POINTS) setHasDrawn(true);
      return next;
    });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasPoint(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
    setDrawPoints((prev) => {
      const next = prev + 1;
      if (next >= MIN_DRAW_POINTS) setHasDrawn(true);
      return next;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawPoints(0);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn || drawPoints < MIN_DRAW_POINTS) {
      message.warning('Vui lòng vẽ chữ ký rõ ràng trên khung trước khi xác nhận!');
      return;
    }
    if (!agreed) {
      message.warning('Vui lòng tích xác nhận đồng ý với toàn bộ điều khoản hợp đồng!');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '800' }}>
          <FileSignature size={20} color="#0F766E" aria-hidden="true" />
          <span>{title}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="clear" icon={<Eraser size={14} />} onClick={handleClear} disabled={loading} style={{ borderRadius: '8px' }}>
          Xóa ký lại
        </Button>,
        <Button key="cancel" onClick={onCancel} disabled={loading} style={{ borderRadius: '8px' }}>
          Hủy
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          icon={<Check size={14} />} 
          loading={loading}
          disabled={loading || !hasDrawn || !agreed}
          onClick={handleSave} 
          style={{ borderRadius: '8px', fontWeight: '700' }}
        >
          Xác nhận chữ ký
        </Button>
      ]}
      width={520}
      centered
      destroyOnHidden
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
          Dùng chuột hoặc ngón tay (trên thiết bị di động/cảm ứng) để ký tên vào ô chữ nhật bên dưới (tối thiểu {MIN_DRAW_POINTS} nét điểm).
        </p>

        <div style={{ 
          border: isDrawing ? '2px solid #0F766E' : hasDrawn ? '2px solid #10b981' : '2px dashed #94a3b8', 
          borderRadius: '12px', 
          background: hasDrawn ? '#f0fdf4' : '#f8fafc', 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          touchAction: 'none',
          transition: 'all 0.2s ease-in-out'
        }}>
          <canvas
            ref={canvasRef}
            width={470}
            height={200}
            role="img"
            aria-label="Khung vẽ chữ ký điện tử"
            style={{ cursor: 'crosshair', width: '100%', height: '200px', display: 'block', borderRadius: '10px' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {drawPoints === 0 && (
            <div style={{ 
              position: 'absolute', 
              pointerEvents: 'none', 
              color: '#94a3b8', 
              fontSize: '15px', 
              fontWeight: '600',
              userSelect: 'none' 
            }}>
              Ký tên tại đây...
            </div>
          )}
          {hasDrawn && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#dcfce7',
              color: '#15803d',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none'
            }}>
              <Check size={12} /> Đã nhận nét ký ({drawPoints} điểm)
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
            <span style={{ fontSize: '13px', color: '#1e293b' }}>
              Tôi đã đọc và đồng ý với toàn bộ điều khoản hợp đồng (Chữ ký được mã hóa SHA-256 bảo toàn tính toàn vẹn)
            </span>
          </Checkbox>
        </div>
      </div>
    </Modal>
  );
};

export default SignaturePadModal;
