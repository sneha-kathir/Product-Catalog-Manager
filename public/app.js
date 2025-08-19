// public/app.js
const api = {
  getCategories: () => fetch('/api/categories').then(r => r.json()),
  createCategory: (payload) => fetch('/api/categories', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json()),
  getAttributes: (categoryId) => fetch(`/api/categories/${categoryId}/attributes`).then(r=>r.json()),
  createAttribute: (categoryId, payload) => fetch(`/api/categories/${categoryId}/attributes`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json()),
  getProducts: (categoryId) => fetch(`/api/categories/${categoryId}/products`).then(r=>r.json()),
  createProduct: (categoryId, payload) => fetch(`/api/categories/${categoryId}/products`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json()),
  getProduct: (productId) => fetch(`/api/products/${productId}`).then(r=>r.json())
};

let currentCategory = null;
const categoryListEl = document.getElementById('categoryList');
const createCategoryBtn = document.getElementById('createCategoryBtn');
const catName = document.getElementById('catName');
const catDesc = document.getElementById('catDesc');

const categoryDetail = document.getElementById('categoryDetail');
const catTitle = document.getElementById('catTitle');
const attributesList = document.getElementById('attributesList');
const attrName = document.getElementById('attrName');
const attrType = document.getElementById('attrType');
const attrOptions = document.getElementById('attrOptions');
const createAttributeBtn = document.getElementById('createAttributeBtn');
const backBtn = document.getElementById('backBtn');
const productsList = document.getElementById('productsList');
const productForm = document.getElementById('productForm');
const createProductBtn = document.getElementById('createProductBtn');
const messageEl = document.getElementById('message');

function showMessage(msg, timeout=3000){
  messageEl.textContent = msg;
  messageEl.style.display = 'block';
  setTimeout(()=> messageEl.style.display='none', timeout);
}

async function loadCategories(){
  const cats = await api.getCategories();
  categoryListEl.innerHTML = '';
  for (const c of cats){
    const div = document.createElement('div'); div.className='item';
    const left = document.createElement('div'); left.innerHTML = `<strong>${c.name}</strong><div class="muted">${c.description || ''}</div>`;
    const btn = document.createElement('button'); btn.textContent = 'Open'; btn.onclick = ()=> openCategory(c);
    div.appendChild(left); div.appendChild(btn);
    categoryListEl.appendChild(div);
  }
}

createCategoryBtn.onclick = async ()=>{
  if (!catName.value.trim()) return showMessage('Provide category name');
  const created = await api.createCategory({name:catName.value.trim(), description:catDesc.value.trim()});
  catName.value=''; catDesc.value='';
  showMessage('Category created');
  loadCategories();
};

async function openCategory(cat){
  currentCategory = cat;
  catTitle.textContent = `Category: ${cat.name}`;
  categoryDetail.classList.remove('hidden');
  document.getElementById('categories').classList.add('hidden');
  await loadAttributes();
  await loadProducts();
  buildProductForm();
}

backBtn.onclick = ()=>{
  currentCategory = null;
  categoryDetail.classList.add('hidden');
  document.getElementById('categories').classList.remove('hidden');
};

async function loadAttributes(){
  attributesList.innerHTML = '';
  const attrs = await api.getAttributes(currentCategory.id);
  for (const a of attrs){
    const div = document.createElement('div'); div.className='item';
    const left = document.createElement('div'); left.innerHTML = `<strong>${a.name}</strong> <small class="muted">${a.data_type}${a.is_required ? ' • required':''}</small>`;
    const right = document.createElement('div'); right.innerHTML = `<small class="muted">id:${a.id}</small>`;
    div.appendChild(left); div.appendChild(right);
    attributesList.appendChild(div);
  }
}

createAttributeBtn.onclick = async ()=>{
  if (!attrName.value.trim()) return showMessage('Attribute name required');
  const data_type = attrType.value;
  let options = null;
  if (data_type === 'enum'){
    const raw = attrOptions.value.trim();
    options = raw ? raw.split(',').map(s=>s.trim()).filter(Boolean): [];
  }
  const payload = { name: attrName.value.trim(), data_type, is_required:false, options_json: options };
  const created = await api.createAttribute(currentCategory.id, payload);
  attrName.value=''; attrOptions.value='';
  showMessage('Attribute added');
  await loadAttributes();
  buildProductForm();
};

async function loadProducts(){
  productsList.innerHTML = '';
  const prods = await api.getProducts(currentCategory.id);
  for (const p of prods){
    const div = document.createElement('div'); div.className='item';
    const left = document.createElement('div'); left.innerHTML = `<strong>${p.name}</strong><div class="muted">SKU: ${p.sku || '-'} • ₹${p.price}</div>`;
    const btn = document.createElement('button'); btn.textContent='View'; btn.onclick = ()=> viewProduct(p.id);
    div.appendChild(left); div.appendChild(btn);
    productsList.appendChild(div);
  }
}

async function buildProductForm(){
  productForm.innerHTML = '';
  const attrs = await api.getAttributes(currentCategory.id);
  // basic fields
  productForm.appendChild(createInputEl('name','Product name'));
  productForm.appendChild(createInputEl('sku','SKU'));
  productForm.appendChild(createInputEl('price','Price','number'));
  productForm.appendChild(createTextAreaEl('description','Description'));
  if (attrs.length){
    productForm.appendChild(document.createElement('hr'));
    const h = document.createElement('h5'); h.textContent='Attributes'; productForm.appendChild(h);
    for (const a of attrs){
      const wrapper = document.createElement('div');
      wrapper.className='form-row';
      wrapper.appendChild(createLabelEl(a.name));
      const input = createAttributeInput(a);
      input.dataset.attrId = a.id;
      wrapper.appendChild(input);
      productForm.appendChild(wrapper);
    }
  }
}

function createInputEl(name, placeholder, type='text'){
  const input = document.createElement('input');
  input.name = name; input.placeholder = placeholder; input.type = type;
  return input;
}
function createTextAreaEl(name, placeholder){
  const ta = document.createElement('textarea'); ta.name=name; ta.placeholder=placeholder; ta.rows=3;
  return ta;
}
function createLabelEl(txt){ const l = document.createElement('label'); l.style.minWidth='160px'; l.textContent = txt; return l; }

function createAttributeInput(attr){
  const dt = attr.data_type;
  if (dt === 'boolean'){
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">--</option><option value="1">True</option><option value="0">False</option>`;
    return sel;
  } else if (dt === 'enum'){
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">--select--</option>`;
    let opts = [];
    try { opts = attr.options_json ? JSON.parse(attr.options_json) : []; } catch(e){ opts = []; }
    if (Array.isArray(opts)){
      for (const o of opts) sel.innerHTML += `<option value="${o}">${o}</option>`;
    }
    return sel;
  } else if (dt === 'number'){
    const inp = document.createElement('input'); inp.type='number'; return inp;
  } else if (dt === 'date'){
    const inp = document.createElement('input'); inp.type='date'; return inp;
  } else if (dt === 'text'){
    return createTextAreaEl('attr','');
  } else {
    return createInputEl('attr','');
  }
}

createProductBtn.onclick = async ()=>{
  const formEls = productForm.querySelectorAll('input, textarea, select');
  const payload = {};
  const attributes = [];
  for (const el of formEls){
    if (el.name === 'name') payload.name = el.value;
    else if (el.name === 'sku') payload.sku = el.value;
    else if (el.name === 'price') payload.price = el.value;
    else if (el.name === 'description') payload.description = el.value;
    else {
      if (el.dataset.attrId){
        attributes.push({ attribute_id: Number(el.dataset.attrId), value: el.value });
      }
    }
  }
  if (!payload.name) return showMessage('Product name required');
  try {
    const res = await api.createProduct(currentCategory.id, { ...payload, attributes });
    showMessage('Product created');
    await loadProducts();
  } catch(err){
    console.error(err);
    showMessage('Error creating product: ' + (err.message || err));
  }
};

async function viewProduct(id){
  const p = await api.getProduct(id);
  const w = window.open('', '_blank');
  let html = `<h1>${p.name}</h1><p>SKU: ${p.sku || '-'} • Price: ${p.price}</p><p>${p.description || ''}</p><h3>Attributes</h3><ul>`;
  for (const a of p.attributes) html += `<li><strong>${a.attr_name}</strong>: ${a.value}</li>`;
  html += `</ul>`;
  w.document.write(html);
  w.document.close();
}

loadCategories();