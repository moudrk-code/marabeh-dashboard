:root{
  --bg:#f7fafc; --card:#fff; --primary:#0A7EA4; --muted:#6b7280; --danger:#ef4444;
  --surface:#f5f7f9;
  font-family: system-ui, "Segoe UI", Roboto, "Noto Sans Arabic", "Almarai", sans-serif;
}

*{box-sizing:border-box}
html,body,#app{height:100%;margin:0;padding:0;background:var(--bg);color:#0f1724}
.app{display:flex;flex-direction:column;min-height:100vh}
.centered{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.panel{max-width:980px;margin:24px auto;padding:16px;background:var(--card);border-radius:12px;box-shadow:0 6px 18px rgba(2,6,23,0.06)}
.hidden{display:none}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--card);border-bottom:1px solid #e6eef6}
.brand{display:flex;align-items:center;gap:12px}
.brand img{width:44px;height:44px;border-radius:8px}
.layout{display:flex;flex-direction:column;height:100%}
.content{display:flex;flex:1;gap:12px;padding:12px}
.sidebar{width:160px;background:transparent}
.sidebar ul{list-style:none;padding:8px;margin:0}
.sidebar li{padding:10px;border-radius:8px;cursor:pointer;color:var(--muted)}
.sidebar li.active{background:linear-gradient(90deg,#e9f6fb,#ffffff);color:var(--primary);font-weight:600}

.panel-view{flex:1}
.panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.actions{display:flex;gap:8px;align-items:center}
.btn{padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;background:transparent;cursor:pointer}
.btn.primary{background:var(--primary);color:white;border:none}
.btn.secondary{background:#eef2f7}
.btn.ghost{background:transparent;border:none;color:var(--muted)}

.summary-cards{display:flex;gap:12px;flex-wrap:wrap}
.card{background:var(--card);padding:12px;border-radius:10px;box-shadow:0 4px 10px rgba(10,126,164,0.03);min-width:160px}
.table-wrap{margin-top:12px;background:var(--card);border-radius:8px;padding:8px}
.table{width:100%;border-collapse:collapse}
.table th,.table td{padding:8px;border-bottom:1px solid #f1f5f9;text-align:right}
.table.small th,.table.small td{padding:6px;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form{display:flex;flex-direction:column;gap:8px}
label{display:flex;flex-direction:column;font-size:14px}
input[type="text"],input[type="email"],input[type="number"],select{padding:8px;border-radius:8px;border:1px solid #e2e8f0}
.error{color:var(--danger);font-size:13px;height:18px}
.row{display:flex;gap:8px;align-items:center}
.mt{margin-top:12px}
.small{font-size:13px}
.muted{color:var(--muted)}
.upload-status{padding:8px;border-radius:8px;background:#fffbe6;border:1px solid #ffe6a7}

.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.5)}
.modal-card{background:var(--card);padding:16px;border-radius:12px;min-width:320px;max-width:90%}

@media (max-width:900px){
  .content{flex-direction:column}
  .sidebar{width:100%;order:2}
  .panel-view{order:1}
  .grid{grid-template-columns:1fr}
}
