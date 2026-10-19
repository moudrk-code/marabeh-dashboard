const LS_USER_KEY = "marabeh.user.v1";
const LS_PRODUCTS_KEY = "marabeh.products.v1";
const LS_AUDIT_KEY = "marabeh.audit-log.v1";

const sampleProducts = [
  { id: "p1", name: "مقوى بطارية 12V", supplier: "مصنع الغد", cost: 120.0, qty: 10 },
  { id: "p2", name: "كرتون تعبئة 50x30", supplier: "سامي للتغليف", cost: 45.5, qty: 20 },
  { id: "p3", name: "شاحن سريع USB-C", supplier: "الشرق للإلكترون", cost: 80.0, qty: 15 },
];

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

const loginView = $("#login-view");
const mainView = $("#main-view");
const currentBusiness = $("#current-business");
const loginForm = $("#login-form");
const guestBtn = $("#guest-btn");
const logoutBtn = $("#logout");

function saveUser(user){localStorage.setItem(LS_USER_KEY, JSON.stringify(user))}
function loadUser(){try{return JSON.parse(localStorage.getItem(LS_USER_KEY))}catch(e){return null}}

function saveProducts(list){localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(list))}
function loadProducts(){const s = localStorage.getItem(LS_PRODUCTS_KEY); return s?JSON.parse(s):null}

function addAudit(entry){
  const list = JSON.parse(localStorage.getItem(LS_AUDIT_KEY) || "[]");
  list.unshift({ id: Date.now(), ...entry });
  localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(list));
  renderAudit();
}

function showMain(){
  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");
  const u = loadUser();
  currentBusiness.textContent = u ? `${u.business} • ${u.email}` : "زائر";
  const products = loadProducts() || sampleProducts;
  if(!loadProducts()) saveProducts(products);
  renderProducts();
  renderSummary();
  populateMarginProduct();
  renderAudit();
  updateDashboardCards();
}

function logout(){
  localStorage.removeItem(LS_USER_KEY);
  loginView.classList.remove("hidden");
  mainView.classList.add("hidden");
}

loginForm.addEventListener("submit", e=>{
  e.preventDefault();
  const name = $("#business-name").value.trim();
  const email = $("#business-email").value.trim();
  let ok=true;
  $("#err-business-name").textContent = name ? "" : "مطلوب";
  $("#err-business-email").textContent = email ? "" : "مطلوب";
  if(!name||!email) ok=false;
  if(!ok) return;
  saveUser({ business: name, email, createdAt: new Date().toISOString() });
  addAudit({ title: "تسجيل دخول", action: "login", destination: "app", metric: null, executedAt: new Date().toISOString() });
  showMain();
});

guestBtn.addEventListener("click", ()=>{
  saveUser({ business: "زائر", email: "guest@example.com" });
  showMain();
});

logoutBtn.addEventListener("click", ()=>{ logout(); });

$all(".sidebar li").forEach(li=>{
  li.addEventListener("click", ()=>{
    $all(".sidebar li").forEach(x=>x.classList.remove("active"));
    li.classList.add("active");
    const tab = li.dataset.tab;
    $all(".panel").forEach(p=>p.classList.remove("active-panel"));
    $("#tab-"+tab).classList.add("active-panel");
  });
});

const productsTableBody = $("#products-table tbody");
function renderProducts(){
  const list = loadProducts() || [];
  productsTableBody.innerHTML = "";
  list.forEach(p=>{
    const vat = +(p.cost * 0.15).toFixed(2);
    const total = +((p.cost + vat) * p.qty).toFixed(2);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.supplier}</td>
      <td>${p.cost.toFixed(2)}</td>
      <td>${vat.toFixed(2)}</td>
      <td>${p.qty}</td>
      <td>${total.toFixed(2)}</td>
      <td><button class="btn small edit" data-id="${p.id}">تعديل</button> <button class="btn small del" data-id="${p.id}">حذف</button></td>
    `;
    productsTableBody.appendChild(tr);
  });
  $all(".btn.small.del").forEach(btn=>btn.addEventListener("click", e=>{
    const id = e.target.dataset.id;
    let list = loadProducts();
    list = list.filter(x=>x.id !== id);
    saveProducts(list);
    addAudit({ title: "حذف منتج", action: "delete_product", destination: id, metric: null, executedAt: new Date().toISOString()});
    renderProducts(); renderSummary(); populateMarginProduct(); updateDashboardCards();
  }));
}

function renderSummary(){
  const list = loadProducts() || [];
  const totalCost = list.reduce((s,p)=>s + p.cost * p.qty, 0);
  const tax = totalCost * 0.15;
  $("#card-total-cost").textContent = `${totalCost.toFixed(2)} SAR`;
  $("#card-tax-total").textContent = `${tax.toFixed(2)} SAR`;
  $("#card-products-count").textContent = list.length;
}

$("#btn-upload-file").addEventListener("click", ()=>$("#file-upload").click());
$("#file-upload").addEventListener("change", async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const status = $("#upload-status");
  status.classList.remove("hidden");
  status.textContent = `جاري قراءة الملف ${f.name} ...`;
  try{
    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const parsed=[];
    const excluded=[];
    rows.forEach((r, i)=>{
      const name = r["name"] || r["اسم المنتج"] || r["product"] || r["Product"];
      const supplier = r["supplier"] || r["المورد"] || r["Supplier"];
      const cost = parseFloat(r["cost"] ?? r["سعر"] ?? r["price"]);
      const qty = parseInt(r["qty"] ?? r["كمية"] ?? r["quantity"]);
      if(!name || !supplier || !cost || cost<=0 || isNaN(qty) || qty<0){
        excluded.push({ row: i+2, raw: r });
      } else {
        parsed.push({ id: "p"+Date.now()+Math.random().toString(36).slice(2,7), name, supplier, cost, qty });
      }
    });
    const existing = loadProducts() || [];
    const merged = existing.concat(parsed);
    saveProducts(merged);
    status.innerHTML = `اكتملت المعالجة: ${parsed.length} صفوف مقبولة، ${excluded.length} مستبعدة.`;
    addAudit({ title: "رفع ملف منتجات", action: "upload_products", destination: f.name, metric: { accepted: parsed.length, excluded: excluded.length }, executedAt: new Date().toISOString()});
    renderProducts(); renderSummary(); populateMarginProduct(); updateDashboardCards();
  }catch(err){
    status.textContent = "خطأ في قراءة الملف: " + err.message;
  }
  e.target.value = "";
});

const modal = $("#modal-add-product");
$("#btn-add-product").addEventListener("click", ()=>{ modal.classList.remove("hidden"); });
$("#modal-close").addEventListener("click", ()=>{ modal.classList.add("hidden"); });

$("#add-product-form").addEventListener("submit", (e)=>{
  e.preventDefault();
  const name = $("#prod-name").value.trim();
  const supplier = $("#prod-supplier").value.trim();
  const cost = parseFloat($("#prod-cost").value);
  const qty = parseInt($("#prod-qty").value);
  let ok = true;
  $("#err-prod-name").textContent = name ? "" : "الاسم مطلوب";
  $("#err-prod-supplier").textContent = supplier ? "" : "اسم المورد مطلوب";
  $("#err-prod-cost").textContent = (isNaN(cost) || cost<=0) ? "السعر يجب أن يكون رقمًا أكبر من صفر" : "";
  $("#err-prod-qty").textContent = (isNaN(qty) || qty<0) ? "الكمية يجب أن تكون عددًا صحيحًا غير سالب" : "";
  if(!name || !supplier || isNaN(cost) || cost<=0 || isNaN(qty) || qty<0) ok=false;
  if(!ok) return;
  const list = loadProducts() || [];
  const id = "p"+Date.now().toString(36).slice(4);
  list.unshift({ id, name, supplier, cost, qty });
  saveProducts(list);
  addAudit({ title: "أضف منتج", action: "add_product", destination: id, metric: { name, supplier, cost, qty }, executedAt: new Date().toISOString()});
  modal.classList.add("hidden");
  $("#add-product-form").reset();
  renderProducts(); renderSummary(); populateMarginProduct(); updateDashboardCards();
});

const ocrModal = $("#modal-ocr");
$("#btn-upload-invoice").addEventListener("click", ()=>ocrModal.classList.remove("hidden"));
$("#ocr-close").addEventListener("click", ()=>ocrModal.classList.add("hidden"));

$("#send-ocr").addEventListener("click", async ()=>{
  const f = $("#ocr-image").files[0];
  if(!f) return alert("اختر صورة أولاً");
  $("#ocr-result").textContent = "جاري الإرسال إلى الخادم (محاكاة) ...";
  await new Promise(r=>setTimeout(r, 900));
  const simulated = {
    products: [
      { name: "شاحن سريع USB-C", supplier: "الشرق للإلكترون", unitPrice: 80.0, qty: 2, confidence: 0.92, notes: "" }
    ],
    message: "تم استخراج 1 منتج (محاكاة)"
  };
  $("#ocr-result").textContent = JSON.stringify(simulated, null, 2);
  const p = simulated.products[0];
  $("#prod-name").value = p.name;
  $("#prod-supplier").value = p.supplier;
  $("#prod-cost").value = p.unitPrice;
  $("#prod-qty").value = p.qty;
  addAudit({ title: "OCR image", action: "ocr_extract", destination: f.name, metric: { extracted: simulated.products.length }, executedAt: new Date().toISOString()});
});

function populateMarginProduct(){
  const sel = $("#margin-product");
  sel.innerHTML = "";
  const list = loadProducts() || [];
  list.forEach(p=>{ const opt = document.createElement("option"); opt.value = p.id; opt.textContent = `${p.name} — ${p.supplier} — ${p.cost.toFixed(2)} SAR`; sel.appendChild(opt); });
}

function getSelectedProductForMargin(){
  const id = $("#margin-product").value;
  const list = loadProducts() || [];
  return list.find(x=>x.id===id) || list[0] || { cost: 0, qty:0 };
}

function computeSale(cost, opts){
  const shipping = opts.shipping || 0;
  const base = cost + shipping;
  const gatewayPercent = opts.includeGateway ? 0.025 : 0;
  const margin = opts.marginPercent / 100;
  const gatewayFee = base * gatewayPercent;
  const priceBeforeVat = margin < 0.999 ? (base + gatewayFee) / (1 - margin) : base + gatewayFee;
  const vat = opts.includeVAT ? priceBeforeVat * 0.15 : 0;
  const saleFinal = priceBeforeVat + vat;
  const netProfit = priceBeforeVat - cost - shipping - gatewayFee;
  return { priceBeforeVat: +priceBeforeVat.toFixed(2), vat: +vat.toFixed(2), saleFinal: +saleFinal.toFixed(2), netProfit: +netProfit.toFixed(2), gatewayFee: +gatewayFee.toFixed(2) };
}

function renderMarginResult(){
  const p = getSelectedProductForMargin();
  const margin = parseFloat($("#margin-slider").value);
  $("#margin-val").textContent = margin;
  const includeShipping = $("#include-shipping").checked;
  const shipping = includeShipping ? parseFloat($("#shipping-cost").value || 0) : 0;
  const includeGateway = $("#include-gateway").checked;
  const includeVAT = $("#include-vat").checked;
  const fixedProfit = parseFloat($("#fixed-profit").value || 0);
  let result = computeSale(p.cost, { marginPercent: margin, shipping, includeGateway, includeVAT });
  if(fixedProfit && fixedProfit > 0){
    result.saleFinal = +( (p.cost + shipping + (includeGateway ? (p.cost+shipping)*0.025 : 0) + fixedProfit ) * (includeVAT ? 1.15 : 1) ).toFixed(2);
    result.priceBeforeVat = +(result.saleFinal / (includeVAT ? 1.15 : 1)).toFixed(2);
    result.netProfit = +(result.priceBeforeVat - p.cost - shipping - (includeGateway ? (p.cost+shipping)*0.025 : 0)).toFixed(2);
    result.vat = +((includeVAT) ? (result.priceBeforeVat*0.15).toFixed(2) : 0);
  }
  $("#sale-price").textContent = `${result.saleFinal.toFixed(2)} SAR`;
  $("#price-before-vat").textContent = `${result.priceBeforeVat.toFixed(2)} SAR`;
  $("#net-profit").textContent = `${result.netProfit.toFixed(2)} SAR`;
  $("#vat-value").textContent = `${result.vat.toFixed(2)} SAR`;

  const compareMargins = [5, margin, 30, 40, 50];
  const tbody = $("#margins-compare tbody"); tbody.innerHTML = "";
  compareMargins.forEach(m=>{
    const res = computeSale(p.cost, { marginPercent: m, shipping, includeGateway, includeVAT: false });
    const saleWithVAT = includeVAT ? +(res.priceBeforeVat * 1.15).toFixed(2) : res.priceBeforeVat;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m}%</td><td>${p.cost.toFixed(2)}</td><td>${res.priceBeforeVat.toFixed(2)}</td><td>${res.netProfit.toFixed(2)}</td><td>${(saleWithVAT).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
}

$all("#margin-slider,#include-shipping,#shipping-cost,#include-gateway,#include-vat,#fixed-profit,#margin-product")
  .forEach(el=>el.addEventListener("input", renderMarginResult));

$("#btn-bank-file").addEventListener("click", ()=>$("#bank-file").click());
$("#bank-file").addEventListener("change", async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const status = $("#bank-status");
  status.textContent = "جارٍ قراءة كشف الحساب (تجريبي) ...";
  try{
    if(f.type === "application/pdf"){ status.textContent = "PDF مدعوم عبر OCR خادمي — في هذه النسخة محاكاة"; }
    else if(f.type.startsWith("image/")){ status.textContent = "صورة مُرسلة لـ OCR خادمي (محاكاة)"; }
    else {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      const transactions = rows.map(r=>({
        date: r["date"] || r["التاريخ"] || r["Date"] || null,
        desc: r["description"] || r["البيان"] || r["Description"] || "",
        amount: parseFloat(r["amount"] || r["المبلغ"] || r["Amount"] || 0)
      }));
      const prods = loadProducts() || [];
      const prodTotals = prods.map(p=>({ id:p.id, expected: +( (p.cost*1.15) * p.qty).toFixed(2), name: p.name }));
      const tbody = $("#bank-table tbody"); tbody.innerHTML = "";
      transactions.forEach(t=>{
        const matched = prodTotals.find(pt=>Math.abs(pt.expected - Math.abs(t.amount)) < 0.5);
        const tr = document.createElement("tr");
        let statusText="غير مطابق"; let cls="";
        if(matched){ statusText = `مطابق: ${matched.name}`; cls="background: #e6ffed;"; }
        else if(t.amount > 0){ statusText = "زيادة"; cls="background:#fff7e6"; }
        else { statusText = "نقص"; cls="background:#ffecec"; }
        tr.style = cls;
        tr.innerHTML = `<td>${t.date||"-"}</td><td>${t.desc}</td><td>${t.amount.toFixed(2)}</td><td>${statusText}</td>`;
        tbody.appendChild(tr);
      });
      status.textContent = `تمت المعالجة: ${transactions.length} عملية`;
      addAudit({ title: "رفع كشف بنكي", action: "bank_upload", destination: f.name, metric: { transactions: transactions.length }, executedAt: new Date().toISOString()});
    }
  }catch(err){ $("#bank-status").textContent = "خطأ: " + err.message; }
  e.target.value="";
});

$("#export-bank-report").addEventListener("click", ()=>{
  const wb = XLSX.utils.book_new();
  const rows = [["التاريخ","البيان","المبلغ","الحالة"]];
  const trs = Array.from($("#bank-table tbody tr")).map(tr=>Array.from(tr.cells).map(c=>c.textContent));
  const ws = XLSX.utils.aoa_to_sheet(rows.concat(trs));
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, "bank-reconciliation.xlsx");
  addAudit({ title: "تصدير تقرير بنك", action: "export_bank", destination: "bank-reconciliation.xlsx", metric: null, executedAt: new Date().toISOString()});
});

function renderAudit(){
  const list = JSON.parse(localStorage.getItem(LS_AUDIT_KEY) || "[]");
  const ul = $("#audit-list");
  ul.innerHTML = "";
  if(list.length === 0){ ul.innerHTML = "<li class='muted'>لا توجد سجلات</li>"; return; }
  list.forEach(it=>{
    const li = document.createElement("li");
    li.innerHTML = `<strong>${it.title}</strong> — ${it.action} — <span class="muted">${new Date(it.executedAt).toLocaleString()}</span>`;
    ul.appendChild(li);
  });
}

function updateDashboardCards(){
  const prods = loadProducts() || [];
  const totalCost = prods.reduce((s,p)=>s + p.cost * p.qty, 0);
  $("#dash-total-cost").textContent = `${totalCost.toFixed(2)} SAR`;
  let expected = 0;
  prods.forEach(p=>{
    const res = computeSale(p.cost, { marginPercent: 25, shipping:0, includeGateway:false, includeVAT:false });
    expected += (res.priceBeforeVat - p.cost) * p.qty;
  });
  $("#dash-expected-profit").textContent = `${expected.toFixed(2)} SAR`;
  $("#dash-actual-profit").textContent = `${(expected*0.78).toFixed(2)} SAR`;

  const recs = [
    { id: "r1", title: "خفض الرسوم البنكية", reason: "رسوم عالية 2.5%", priority: "عاجل", action: "open:bank" },
    { id: "r2", title: "زيادة هامش منتج شاحن سريع", reason: "هامش منخفض عن المتوسط", priority: "مهم", action: "open:margins" }
  ];
  const el = $("#recommendations"); el.innerHTML="";
  recs.forEach(r=>{
    const li = document.createElement("li");
    li.innerHTML = `<strong>${r.title}</strong> — ${r.reason} — <em>${r.priority}</em> <button class="btn small" data-action="${r.action}">تنفيذ</button>`;
    el.appendChild(li);
    li.querySelector("button").addEventListener("click", ()=>handleRecommendation(r));
  });
}

function handleRecommendation(r){
  addAudit({ title: "تنفيذ توصية", action: "execute_recommendation", destination: r.id, metric: { action: r.action }, executedAt: new Date().toISOString()});
  if(r.action === "open:bank"){ $all(".sidebar li").forEach(x=>x.classList.remove("active")); document.querySelector('[data-tab="bank"]').classList.add("active"); $all(".panel").forEach(p=>p.classList.remove("active-panel")); $("#tab-bank").classList.add("active-panel"); }
  if(r.action === "open:margins"){ $all(".sidebar li").forEach(x=>x.classList.remove("active")); document.querySelector('[data-tab="margins"]').classList.add("active"); $all(".panel").forEach(p=>p.classList.remove("active-panel")); $("#tab-margins").classList.add("active-panel"); }
  alert("تم تنفيذ التوصية محليًا (محاكاة). راجع السجل.");
  renderAudit();
}

(function init(){
  const u = loadUser();
  if(u) showMain();
  else loginView.classList.remove("hidden");
  if(!loadProducts()) saveProducts(sampleProducts);
  renderProducts(); renderSummary(); populateMarginProduct(); renderMarginResult();
})();
