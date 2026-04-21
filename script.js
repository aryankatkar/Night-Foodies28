const products = [
  { id: 1, name: "Bread Omelette", qty: "1 pc", category: "food", price: 30, emoji: "🥪" },
  { id: 2, name: "Classic Omelette", qty: "1 pc", category: "food", price: 20, emoji: "🍳" },
  { id: 3, name: "Onion Omelette", qty: "1 pc", category: "food", price: 20, emoji: "🥚" },
  { id: 4, name: "Chai", qty: "1 cup", category: "drinks", price: 10, emoji: "☕" },
  { id: 5, name: "Coffee", qty: "1 cup", category: "drinks", price: 15, emoji: "🍵" },
  { id: 6, name: "Campa", qty: "1 btl", category: "drinks", price: 15, emoji: "🥤" },
  { id: 7, name: "Lahori Jira Soda", qty: "1 btl", category: "drinks", price: 15, emoji: "🥂" },
  { id: 8, name: "Water Bottles", qty: "1 btl", category: "drinks", price: 12, emoji: "💧" },
  { id: 9, name: "Crush", qty: "1 pc", category: "cigarettes", price: 15, emoji: "🚬" },
  { id: 10, name: "Black Crush", qty: "1 pc", category: "cigarettes", price: 15, emoji: "🚬" },
  { id: 11, name: "Gold Flack Mint", qty: "1 pc", category: "cigarettes", price: 17, emoji: "🚬" },
  { id: 12, name: "Gold Flack", qty: "1 pc", category: "cigarettes", price: 17, emoji: "🚬" },
  { id: 13, name: "Compact Amarican", qty: "1 pc", category: "cigarettes", price: 15, emoji: "🚬" },
  { id: 14, name: "American", qty: "1 pc", category: "cigarettes", price: 25, emoji: "🚬" },
  { id: 15, name: "Classic Mild", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
  { id: 16, name: "Black Filter", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
  { id: 17, name: "Advance", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
  { id: 18, name: "Gold Flack Light", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
  { id: 19, name: "Big Gold Flack", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
  { id: 20, name: "Mixpot", qty: "1 pc", category: "cigarettes", price: 30, emoji: "🚬" },
];

const AUTH_KEY = "nightFoodiesLoggedInUser";

window.togglePassword = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
};

const isLoginPage = window.location.pathname.toLowerCase().endsWith("/login.html");
const isSignupPage = window.location.pathname.toLowerCase().endsWith("/signup.html");
const isHomePage = window.location.pathname.toLowerCase().endsWith("/index.html") || window.location.pathname.endsWith("/");
const isCheckoutPage = window.location.pathname.toLowerCase().endsWith("/checkout.html");

function getLoggedInUser() {
  return localStorage.getItem(AUTH_KEY);
}

function requireAuth() {
  const user = getLoggedInUser();
  if ((isHomePage || isCheckoutPage) && !user) {
    window.location.href = "login.html";
  }
  if ((isLoginPage || isSignupPage) && user) {
    window.location.href = "index.html";
  }
}

requireAuth();

const state = {
  category: "all",
  query: "",
  cart: [],
};

const productGrid = document.getElementById("productGrid");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const categoryRow = document.getElementById("categoryRow");
const searchInput = document.getElementById("searchInput");
const logoutBtn = document.getElementById("logoutBtn");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const authMessage = document.getElementById("authMessage");
const signupForm = document.getElementById("signupForm");
const fullNameInput = document.getElementById("fullNameInput");
const signupPhoneInput = document.getElementById("signupPhoneInput");
const emailInput = document.getElementById("emailInput");
const addressInput = document.getElementById("addressInput");
const signupPasswordInput = document.getElementById("signupPasswordInput");
const signupMessage = document.getElementById("signupMessage");
const goLoginBtn = document.getElementById("goLoginBtn");
const cancelCheckoutBtn = document.getElementById("cancelCheckoutBtn");

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const isNetwork =
      error instanceof TypeError ||
      (error && error.message && String(error.message).toLowerCase().includes("fetch"));
    if (isNetwork) {
      throw new Error(
        "Server se connect nahi ho paya. Terminal me project folder me `npm start` chalao, phir yahi browser me http://localhost:3000 kholo — HTML file ko double-click (file://) se mat kholo."
      );
    }
    throw error;
  }

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (error) {
    data = { message: raw || "Server returned an unexpected response." };
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

if (loginForm && phoneInput && passwordInput && authMessage) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();
    const phoneRegex = /^\d{10}$/;

    if (!phone || !password) {
      authMessage.textContent = "Please enter phone number and password.";
      return;
    }

    if (!phoneRegex.test(phone)) {
      authMessage.textContent = "Phone number must be 10 digits.";
      return;
    }

    try {
      authMessage.textContent = "";
      const data = await postJson("/api/auth/login", { phone, password });
      localStorage.setItem(AUTH_KEY, data.user.phone);
      window.location.href = "index.html";
    } catch (error) {
      authMessage.textContent = error.message;
    }
  });
}

if (signupBtn && phoneInput && passwordInput && authMessage) {
  signupBtn.addEventListener("click", () => {
    window.location.href = "signup.html";
  });
}

if (signupForm && fullNameInput && signupPhoneInput && signupPasswordInput && signupMessage) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fullName = fullNameInput.value.trim();
    const phone = signupPhoneInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";
    const password = signupPasswordInput.value.trim();
    const phoneRegex = /^\d{10}$/;

    if (!fullName || !phone || !password) {
      signupMessage.textContent = "Please fill full name, phone and password.";
      return;
    }

    if (!phoneRegex.test(phone)) {
      signupMessage.textContent = "Phone number must be 10 digits.";
      return;
    }

    try {
      await postJson("/api/auth/signup", { fullName, phone, email, address, password });
      signupMessage.textContent = "Account created. Redirecting to login...";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (error) {
      signupMessage.textContent = error.message;
    }
  });
}

if (goLoginBtn) {
  goLoginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "login.html";
  });
}

if (cancelCheckoutBtn) {
  cancelCheckoutBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

function getDeliveryFee() {
  const currentHour = new Date().getHours();
  if (currentHour >= 6 && currentHour < 23) {
    return { fee: 15, type: 'Day' };
  } else {
    return { fee: 20, type: 'Night' };
  }
}

function formatRupees(value) {
  return `Rs. ${value}`;
}

function getFilteredProducts() {
  return products.filter((item) => {
    const categoryMatch = state.category === "all" || item.category === state.category;
    const queryMatch = item.name.toLowerCase().includes(state.query.toLowerCase());
    return categoryMatch && queryMatch;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();

  if (!filtered.length) {
    productGrid.innerHTML = "<p>No products found.</p>";
    return;
  }

  productGrid.innerHTML = filtered
    .map(
      (item) => `
      <article class="product">
        <div class="product-img">${item.emoji}</div>
        <h4>${item.name}</h4>
        <div class="meta">${item.qty} • 10 min</div>
        <div class="price-row">
          <strong>${formatRupees(item.price)}</strong>
          <button data-id="${item.id}" type="button">ADD</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderCart() {
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartDelivery = document.getElementById("cartDelivery");
  const deliveryLabel = document.getElementById("deliveryLabel");

  if (!state.cart.length) {
    cartList.innerHTML = "<div class='cart-empty-text'>Your cart is empty</div>";
    if (cartSubtotal) cartSubtotal.textContent = "Rs. 0";
    if (cartDelivery) cartDelivery.textContent = "Rs. 0";
    cartTotal.textContent = "Rs. 0";
    return;
  }

  const cartGroups = {};
  state.cart.forEach(item => {
    if (!cartGroups[item.id]) {
      cartGroups[item.id] = { ...item, cartQty: 0 };
    }
    cartGroups[item.id].cartQty++;
  });
  const groupedItems = Object.values(cartGroups);

  cartList.innerHTML = groupedItems.map((item) => `
    <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
      <div style="flex:1;">
        ${item.name} <div style="color:var(--muted); font-size:0.85em;">${formatRupees(item.price)}</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:8px;">
        <button class="decrease-qty-btn" data-id="${item.id}" style="background:transparent; border:none; color:var(--text); font-size:1.2rem; line-height:1; cursor:pointer;" title="Decrease">&minus;</button>
        <span style="font-weight:600; width:16px; text-align:center;">${item.cartQty}</span>
        <button class="increase-qty-btn" data-id="${item.id}" style="background:transparent; border:none; color:var(--primary); font-size:1.2rem; line-height:1; cursor:pointer;" title="Increase">&plus;</button>
      </div>
    </li>
  `).join("");
  
  const subtotal = state.cart.reduce((sum, item) => sum + item.price, 0);
  const delivery = getDeliveryFee();

  if (cartSubtotal) cartSubtotal.textContent = formatRupees(subtotal);
  if (cartDelivery) cartDelivery.textContent = formatRupees(delivery.fee);
  if (deliveryLabel) deliveryLabel.textContent = `Delivery (${delivery.type})`;

  cartTotal.textContent = formatRupees(subtotal + delivery.fee);
}

if (productGrid && cartList && cartTotal && categoryRow && searchInput) {
  categoryRow.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (!target.dataset.category) return;

    state.category = target.dataset.category;
    categoryRow.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
    target.classList.add("active");
    renderProducts();
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderProducts();
  });

  productGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const id = Number(target.dataset.id);
    const chosen = products.find((item) => item.id === id);
    if (!chosen) return;

    state.cart.push(chosen);
    renderCart();
  });

  cartList.addEventListener("click", (event) => {
    const decreaseBtn = event.target.closest(".decrease-qty-btn");
    const increaseBtn = event.target.closest(".increase-qty-btn");

    if (decreaseBtn) {
      const id = Number(decreaseBtn.dataset.id);
      const index = state.cart.map(p => p.id).lastIndexOf(id);
      if (index !== -1) {
        state.cart.splice(index, 1);
        renderCart();
      }
    } else if (increaseBtn) {
      const id = Number(increaseBtn.dataset.id);
      const chosen = products.find(p => p.id === id);
      if (chosen) {
        state.cart.push(chosen);
        renderCart();
      }
    }
  });

  renderProducts();
  renderCart();
}

const CART_STORAGE_KEY = "nightFoodiesSavedCart";
const checkoutBtn = document.querySelector(".checkout-btn");

if (checkoutBtn && !isCheckoutPage) {
  checkoutBtn.addEventListener("click", () => {
    if (state.cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
    window.location.href = "checkout.html";
  });
}

const topNav = document.querySelector(".top-nav");
if (topNav) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      topNav.classList.add("scrolled");
    } else {
      topNav.classList.remove("scrolled");
    }
  });
}

const checkoutCartList = document.getElementById("checkoutCartList");
const checkoutCartTotal = document.getElementById("checkoutCartTotal");
const paymentOptions = document.getElementById("paymentOptions");
const payNowBtn = document.getElementById("payNowBtn");
const checkoutMessage = document.getElementById("checkoutMessage");

if (isCheckoutPage) {
  const savedCartRaw = localStorage.getItem(CART_STORAGE_KEY);
  let savedCart = [];
  try {
    savedCart = savedCartRaw ? JSON.parse(savedCartRaw) : [];
  } catch (e) { }

  if (savedCart.length === 0) {
    if (checkoutCartList) checkoutCartList.innerHTML = "<div class='cart-empty-text'>Your cart is empty.</div>";
    if (checkoutCartTotal) checkoutCartTotal.textContent = "Rs. 0";
    if (payNowBtn) payNowBtn.disabled = true;
  } else {
    if (checkoutCartList) {
      const checkoutGroups = {};
      savedCart.forEach(item => {
        if (!checkoutGroups[item.id]) checkoutGroups[item.id] = { ...item, cartQty: 0 };
        checkoutGroups[item.id].cartQty++;
      });
      checkoutCartList.innerHTML = Object.values(checkoutGroups).map((item) => `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
          <div>${item.name} <span style="color:var(--muted); font-size:0.85em;">- ${formatRupees(item.price)}</span></div>
          <span style="font-weight:600;">Qty: ${item.cartQty}</span>
        </li>
      `).join("");
    }
    const subtotal = savedCart.reduce((sum, item) => sum + item.price, 0);
    const delivery = getDeliveryFee();
    
    const subtotalEl = document.getElementById("checkoutCartSubtotal");
    const deliveryEl = document.getElementById("checkoutCartDelivery");
    const labelEl = document.getElementById("checkoutDeliveryLabel");

    if (subtotalEl) subtotalEl.textContent = formatRupees(subtotal);
    if (deliveryEl) deliveryEl.textContent = formatRupees(delivery.fee);
    if (labelEl) labelEl.textContent = `Delivery (${delivery.type})`;

    if (checkoutCartTotal) {
      checkoutCartTotal.textContent = formatRupees(subtotal + delivery.fee);
    }
  }

  if (paymentOptions) {
    paymentOptions.addEventListener("change", (e) => {
       document.querySelectorAll(".payment-option").forEach(opt => opt.classList.remove("active"));
       if (e.target.closest(".payment-option")) {
         e.target.closest(".payment-option").classList.add("active");
       }
    });
  }

  if (payNowBtn && checkoutMessage) {
    payNowBtn.addEventListener("click", () => {
      checkoutMessage.style.color = "var(--primary)";
      checkoutMessage.textContent = "Processing payment...";
      payNowBtn.disabled = true;
      payNowBtn.textContent = "Please wait...";

      setTimeout(() => {
        // Show success popup
        alert("Your order has been placed!");
        checkoutMessage.textContent = "Order Placed Successfully! Redirecting...";
        localStorage.removeItem(CART_STORAGE_KEY);
        setTimeout(() => {
          window.location.href = "index.html";
        }, 3000);
      }, 1500);
    });
  }
}
