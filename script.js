// Book Hike — Pro
;(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function showToast(msg){
    const t = $("#toast"); if(!t) return;
    t.textContent = msg; t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 1600);
  }
  function lsGet(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch{ return fallback } }
  function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)) }

  // ===== Users & Admins =====
  function users(){ return lsGet("bh_users", []) }
  function setUsers(list){ lsSet("bh_users", list) }
  function currentUser(){ return lsGet("bh_current_user", null) }
  function setCurrentUser(u){ lsSet("bh_current_user", u) }
  function adminList(){ return lsGet("bh_admins", []) }
  function addAdmin(email){ email=(email||"").trim().toLowerCase(); if(!email) return; const list=adminList(); if(!list.includes(email)){ list.push(email); lsSet("bh_admins", list); } }
  function ensureAdminsSeed(){ if(!localStorage.getItem("bh_admins")) lsSet("bh_admins", []); }
  function isAdminEmail(email){ if(!email) return false; const e=email.toLowerCase(); return e==="admin@bookhike.test" || adminList().includes(e); }
  function isAdminUser(u){ return !!(u && isAdminEmail(u.email)) }

  // ===== Routing protection =====
  const PUBLIC_PAGES = ["auth.html"];
  function pageName(){ const p = location.pathname.split("/").pop() || "index.html"; return p; }
  function requireAuth(){
    const u = currentUser();
    const p = pageName();
    const isPublic = PUBLIC_PAGES.includes(p);
    if(!u && !isPublic){ location.href = "auth.html"; return false; }
    if(u && isPublic){ location.href = isAdminUser(u) ? "admin.html" : "index.html"; return false; }
    return true;
  }

  // ===== Books =====
  const defaultBooks = [
    {id:"bk-atomic", title:"Atomic Habits", author:"James Clear", price:399, tags:["self-help","habits"], img:"https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-dsa", title:"Mastering DSA in C++", author:"S. S. Bansal", price:549, tags:["education","programming"], img:"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-deep", title:"Deep Work", author:"Cal Newport", price:449, tags:["productivity"], img:"https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-os", title:"Operating Systems", author:"Galvin", price:799, tags:["education","cs"], img:"https://images.unsplash.com/photo-1517433456452-f9633a875f6f?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-dbms", title:"DBMS Made Easy", author:"Narasimha", price:599, tags:["education","cs"], img:"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-ikigai", title:"Ikigai", author:"Héctor García", price:299, tags:["self-help"], img:"https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=500&auto=format&fit=crop"},
    {id:"bk-algo", title:"Intro to Algorithms", author:"CLRS", price:1599, tags:["education","cs"], img:"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=500&auto=format&fit=crop"}
  ];
  function getBooks(){ let b = lsGet("bh_books", null); if(!b){ b = defaultBooks; lsSet("bh_books", b); } return b; }
  function setBooks(list){ lsSet("bh_books", list) }

  // ===== Cart =====
  function cartKey(){ const u = currentUser(); return u ? `bh_cart_${u.email}` : "bh_cart_guest"; }
  function getCart(){ return lsGet(cartKey(), []) }
  function setCart(c){ lsSet(cartKey(), c); updateCartCount() }
  function updateCartCount(){ const count = getCart().reduce((a,i)=>a+i.qty,0); $$("#cart-count").forEach(el=> el.textContent = count); }
  function addToCart(id){ const book = getBooks().find(b=>b.id===id); if(!book) return; const cart = getCart(); const item = cart.find(i=>i.id===id); if(item) item.qty += 1; else cart.push({id, qty:1}); setCart(cart); showToast(`Added: ${book.title}`); }
  function removeFromCart(id){ let cart = getCart().filter(i=>i.id!==id); setCart(cart); }
  function changeQty(id, delta){ const cart=getCart(); const item=cart.find(i=>i.id===id); if(!item) return; item.qty += delta; if(item.qty<=0) return removeFromCart(id); setCart(cart); }

  // ===== UI Auth controls =====
  function updateAuthUI(){
    const user = currentUser();
    const greet = $("#greeting"); const logoutBtn = $("#logout-btn");
    const adminLink = $("#admin-link"); const authLink = $("#auth-link");
    if(greet) greet.textContent = user ? `Hi, ${user.username || user.email}` : "";
    if(logoutBtn){
      logoutBtn.style.display = user ? "inline-flex" : "none";
      logoutBtn.onclick = ()=>{ localStorage.removeItem("bh_current_user"); showToast("Logged out"); setTimeout(()=> location.href="auth.html", 300); };
    }
    if(authLink){ authLink.style.display = user ? "none" : "inline-flex"; }
    if(adminLink){ adminLink.style.display = isAdminUser(user) ? "inline-flex" : "none"; }
  }

  // ===== Categories and rendering =====
  const categories = ["All","Self-help","Education","CS","Programming","Productivity"];
  const mapCat = { "Self-help":["self-help"], "Education":["education"], "CS":["cs"], "Programming":["programming"], "Productivity":["productivity"] };
  function renderChips(){
    const wrap = $("#category-chips"); if(!wrap) return;
    wrap.innerHTML = "";
    categories.forEach((c,i)=>{
      const chip = document.createElement("button");
      chip.className = "chip" + (i===0?" active":"");
      chip.textContent = c; chip.dataset.cat = c;
      chip.addEventListener("click", ()=>{ $$(".chip").forEach(x=>x.classList.remove("active")); chip.classList.add("active"); renderProducts(); });
      wrap.appendChild(chip);
    });
  }
  function getActiveTags(){
    const active = $(".chip.active"); if(!active) return [];
    const name = active.dataset.cat; if(name==="All") return []; return mapCat[name] || [];
  }
  function openDetails(b){
    const modal = $("#details-modal"); if(!modal) return;
    $("#dm-title").textContent = b.title;
    $("#dm-author").textContent = b.author;
    $("#dm-img").src = b.img;
    $("#dm-price").textContent = "₹"+b.price;
    $("#dm-add").onclick = ()=> addToCart(b.id);
    modal.classList.add("show");
  }
  function closeDetails(){ $("#details-modal")?.classList.remove("show"); }

  function renderProducts(){
    const root = $("#products"); if(!root) return;
    const q = ($("#search-input")?.value || "").toLowerCase().trim();
    const tags = getActiveTags(); const sort = $("#sort-select")?.value || "featured";
    let list = getBooks().filter(b=>{
      const qOk = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.tags||[]).some(t=>t.includes(q));
      const tagOk = tags.length===0 || (b.tags||[]).some(t=>tags.includes(t)); return qOk && tagOk;
    });
    if(sort==="price-asc") list.sort((a,b)=>a.price-b.price);
    if(sort==="price-desc") list.sort((a,b)=>b.price-a.price);
    if(sort==="title-asc") list.sort((a,b)=>a.title.localeCompare(b.title));
    if(sort==="title-desc") list.sort((a,b)=>b.title.localeCompare(a.title));
    root.innerHTML = "";
    list.forEach(b=>{
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="thumb"><img alt="${b.title}" src="${b.img}"/></div>
        <div class="body">
          <h3>${b.title}</h3>
          <div class="muted tiny">${b.author}</div>
          <div class="meta">
            <div class="price">₹${b.price}</div>
            <div class="actions-row">
              <button class="ghost small" data-view="${b.id}">View</button>
              <button class="primary small" data-add="${b.id}">Add</button>
            </div>
          </div>
        </div>`;
      root.appendChild(card);
    });
    $$("button[data-add]").forEach(btn => btn.addEventListener("click", ()=> addToCart(btn.dataset.add)));
    $$("button[data-view]").forEach(btn => btn.addEventListener("click", ()=> {
      const book = getBooks().find(x=>x.id===btn.dataset.view);
      if(book) openDetails(book);
    }));
  }

  // ===== Cart page =====
  function renderCart(){
    const root = $("#cart-items"); if(!root) return;
    const cart = getCart();
    if(cart.length===0){ root.innerHTML = `<div class="card" style="padding:16px">Your cart is empty. <a href="index.html">Go shopping →</a></div>`; $("#cart-total").textContent = "₹0"; return; }
    root.innerHTML = ""; let total = 0;
    cart.forEach(it=>{
      const b = getBooks().find(x=>x.id===it.id); const line = b.price * it.qty; total += line;
      const row = document.createElement("div"); row.className = "card"; row.style.padding = "12px 16px";
      row.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div class="row">
            <img src="${b.img}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb"/>
            <div>
              <strong>${b.title}</strong>
              <div class="muted tiny">${b.author}</div>
              <div class="muted tiny">₹${b.price} × ${it.qty}</div>
            </div>
          </div>
          <div class="row">
            <button class="ghost small" data-dec="${b.id}">−</button>
            <button class="ghost small" data-inc="${b.id}">+</button>
            <button class="ghost small" data-rem="${b.id}">Remove</button>
          </div>
        </div>`;
      root.appendChild(row);
    });
    $("#cart-total").textContent = "₹"+total;
    $$("button[data-dec]").forEach(b=> b.onclick = ()=> changeQty(b.dataset.dec, -1));
    $$("button[data-inc]").forEach(b=> b.onclick = ()=> changeQty(b.dataset.inc, +1));
    $$("button[data-rem]").forEach(b=> b.onclick = ()=> removeFromCart(b.dataset.rem));
  }

  // ===== Checkout (demo) =====
  function setupCheckout(){
    const btn = $("#checkout-btn"); if(!btn) return;
    btn.addEventListener("click", ()=>{
      if(!requireAuth()) return;
      const cart = getCart(); if(cart.length===0){ showToast("Cart is empty"); return; }
      const user = currentUser(); const ordersKey = `bh_orders_${user.email}`;
      const snapshot = cart.map(i => { const b = getBooks().find(x=>x.id===i.id); return {id:b.id, title:b.title, qty:i.qty, price:b.price}; });
      const orders = lsGet(ordersKey, []); orders.push({id: "ord-"+Date.now(), items: snapshot, at: new Date().toISOString()});
      lsSet(ordersKey, orders); setCart([]); renderCart(); showToast("Order placed! (demo)");
    });
  }

  // ===== Auth forms =====
  function setupLogin(){
    const form = $("#login-form"); if(!form) return;
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const email = $("#login-email").value.trim().toLowerCase();
      const pass = $("#login-password").value;
      // demo admin shortcut
      if(email==="admin@bookhike.test"){ setCurrentUser({email, username:"Admin"}); location.href="admin.html"; return; }
      const u = users().find(u => u.email===email && u.password===pass);
      if(!u){ showToast("Invalid credentials"); return; }
      setCurrentUser({email:u.email, username:u.username, name:u.name});
      showToast("Welcome back, "+(u.username||u.email));
      setTimeout(()=> location.href = (isAdminEmail(email) ? "admin.html" : "index.html"), 300);
    });
  }
  function setupSignup(){
    const form = $("#signup-form"); if(!form) return;
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const name = $("#su-name").value.trim();
      const username = $("#su-username").value.trim();
      const email = $("#su-email").value.trim().toLowerCase();
      const password = $("#su-password").value;
      let list = users();
      if(list.some(u=>u.email===email)){ showToast("Email already exists"); return; }
      list.push({name, username, email, password}); // demo only
      setUsers(list);
      if(adminList().length === 0){ addAdmin(email); } // first user becomes admin
      setCurrentUser({email, username, name});
      showToast("Account created");
      setTimeout(()=> location.href = (isAdminEmail(email) ? "admin.html" : "index.html"), 300);
    });
  }

  // ===== Admin Page =====
  function renderAdminPage(){
    const tbody = document.querySelector("#books-table tbody");
    const idEl = document.getElementById("bk-id");
    const titleEl = document.getElementById("bk-title");
    const authorEl = document.getElementById("bk-author");
    const priceEl = document.getElementById("bk-price");
    const tagsEl = document.getElementById("bk-tags");
    const imgEl = document.getElementById("bk-img");
    const resetBtn = document.getElementById("reset-form");
    const seedBtn = document.getElementById("seed-demo");
    const adminListWrap = document.getElementById("admin-list");
    const addAdminBtn = document.getElementById("add-admin");
    const newAdminEmail = document.getElementById("new-admin-email");

    function clearForm(){ idEl.value=""; titleEl.value=""; authorEl.value=""; priceEl.value=""; tagsEl.value=""; imgEl.value=""; }
    resetBtn?.addEventListener("click", clearForm);

    function renderBooksTable(){
      const books = getBooks(); tbody.innerHTML = "";
      books.forEach(b => {
        const tr = document.createElement("tr");
        const tagsTxt = (b.tags||[]).join(", ");
        tr.innerHTML = `
          <td><img src="${b.img}" alt="" style="width:38px;height:50px;object-fit:cover;border-radius:6px"/></td>
          <td>${b.title}</td>
          <td>${b.author}</td>
          <td>₹${b.price}</td>
          <td>${tagsTxt}</td>
          <td>
            <button class="ghost small" data-edit="${b.id}">Edit</button>
            <button class="danger small" data-del="${b.id}">Delete</button>
          </td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit");
        const b = getBooks().find(x => x.id === id);
        if(!b) return;
        idEl.value = b.id; titleEl.value = b.title; authorEl.value = b.author;
        priceEl.value = b.price; tagsEl.value = (b.tags||[]).join(", "); imgEl.value = b.img || "";
        window.scrollTo({top:0, behavior:"smooth"});
      }));
      tbody.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        if(!confirm("Delete this book?")) return;
        const list = getBooks().filter(x => x.id !== id);
        setBooks(list); renderBooksTable(); showToast("Book deleted");
      }));
    }

    seedBtn?.addEventListener("click", ()=>{ setBooks(defaultBooks); renderBooksTable(); showToast("Seeded demo books"); });

    function renderAdmins(){
      const list = adminList();
      adminListWrap.innerHTML = "";
      list.forEach(email => {
        const el = document.createElement("span");
        el.className = "pill";
        el.innerHTML = `${email} <button class="ghost small" data-rem-admin="${email}">Remove</button>`;
        adminListWrap.appendChild(el);
      });
      adminListWrap.querySelectorAll("[data-rem-admin]").forEach(btn => btn.addEventListener("click", ()=>{
        const email = btn.getAttribute("data-rem-admin");
        const list = adminList().filter(e => e !== email);
        lsSet("bh_admins", list); renderAdmins();
      }));
    }
    addAdminBtn?.addEventListener("click", ()=>{
      const email = (newAdminEmail.value||"").trim().toLowerCase();
      if(!email){ showToast("Enter email"); return; }
      addAdmin(email); showToast("Admin added"); newAdminEmail.value = ""; renderAdmins();
    });

    renderBooksTable(); renderAdmins();
  }

  // Namespace
  window.BH = {
    isAdmin: ()=> isAdminUser(currentUser()),
    requireAuth: requireAuth,
    renderAdmin: renderAdminPage
  };

  // ===== Boot =====
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureAdminsSeed();
    updateAuthUI();
    updateCartCount();

    if($("#products")){ renderChips(); renderProducts();
      $("#sort-select")?.addEventListener("change", renderProducts);
      $("#search-input")?.addEventListener("input", renderProducts);
      $("#clear-search")?.addEventListener("click", ()=>{ $("#search-input").value=""; renderProducts(); });
    }
    if($("#cart-items")){ renderCart(); setupCheckout(); }
    setupLogin(); setupSignup();

    // details modal
    $("#dm-close")?.addEventListener("click", ()=> $("#details-modal").classList.remove("show"));
    $("#dm-close-2")?.addEventListener("click", ()=> $("#details-modal").classList.remove("show"));
    $("#details-modal")?.addEventListener("click", (e)=>{ if(e.target.id==="details-modal") e.currentTarget.classList.remove("show"); });
  });
})();
