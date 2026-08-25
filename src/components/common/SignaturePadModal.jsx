import { useRef, useState, useEffect } from 'react';
import { Modal, Button, message } from 'antd';
import { Eraser, Check, FileSignature } from 'lucide-react';

const SignaturePadModal = ({ open, onCancel, onConfirm, title = "Vẽ chữ ký điện tử", loading = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (open) {
      setHasDrawn(false);
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

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    let x, y;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn) {
      message.warning('Vui lòng vẽ chữ ký trên khung trước khi xác nhận!');
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
          <FileSignature size={20} color="#2563eb" />
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
          onClick={handleSave} 
          style={{ background: '#2563eb', border: 'none', borderRadius: '8px', fontWeight: '700' }}
        >
          Xác nhận chữ ký
        </Button>
      ]}
      width={520}
      centered
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
          Dùng chuột hoặc ngón tay (trên thiết bị di động/cảm ứng) để ký tên vào ô chữ nhật bên dưới.
        </p>

        <div style={{ 
          border: '2px dashed #94a3b8', 
          borderRadius: '12px', 
          background: '#f8fafc', 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          touchAction: 'none'
        }}>
          <canvas
            ref={canvasRef}
            width={470}
            height={200}
            style={{ cursor: 'crosshair', width: '100%', height: '200px', display: 'block', borderRadius: '10px' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div style={{ 
              position: 'absolute', 
              pointerEvents: 'none', 
              color: '#cbd5e1', 
              fontSize: '15px', 
              fontWeight: '600',
              userSelect: 'none' 
            }}>
              Ký tên tại đây...
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SignaturePadModal;
