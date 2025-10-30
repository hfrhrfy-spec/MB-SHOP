const firebaseConfig = {
  apiKey: "AIzaSyBHA7MTDViILl4UxWg0S8KSBPp2H5RZotk",
  authDomain: "kawsar-apps.firebaseapp.com",
  databaseURL: "https://kawsar-apps-default-rtdb.firebaseio.com",
  projectId: "kawsar-apps",
  storageBucket: "kawsar-apps.firebasestorage.app",
  messagingSenderId: "995068241831",
  appId: "1:995068241831:web:7752625c4f863a88603882",
  measurementId: "G-CHCM2KTXPM"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function showPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function toBanglaNumber(num) {
  const bnNums = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  return num.toString().split('').map(d => bnNums[d] || d).join('');
}

// 🔹 লাইভ ব্যালেন্স
db.ref('app_data/balance').on('value', snapshot => {
  const bal = snapshot.val() || 0;
  document.getElementById('balanceBox').innerHTML = `<h3>বর্তমান ব্যালেন্স: ${toBanglaNumber(bal)} টাকা</h3>`;
});

// 🔹 লাইভ প্যাকেজ
db.ref('app_data/packages').on('value', snapshot => {
  const packages = snapshot.val() || [];
  const container = document.getElementById('packageContainer');
  container.innerHTML = "";
  packages.forEach(p=>{
      const priceBn = toBanglaNumber(p.price);
      const daysBn = toBanglaNumber(p.days);
      const div = document.createElement('div');
      div.className = "card";
      div.innerHTML = `<h3>${p.name}</h3><p>মূল্য: ${priceBn} টাকা | মেয়াদ: ${daysBn} দিন</p><a href="#" class="btn" onclick="buyPackage(${p.price}, '${p.name}')">কিনুন</a>`;
      container.appendChild(div);
  });
});

// 🔹 প্রোফাইল
db.ref('app_data/profile').on('value', snapshot => {
  const prof = snapshot.val() || { name: "-", phone: "-", loc: "-" };
  document.getElementById('profileBox').innerHTML = `<p><b>নাম:</b> ${prof.name}</p><p><b>ফোন:</b> ${prof.phone}</p><p><b>অবস্থান:</b> ${prof.loc}</p>`;
});

// 🔹 ট্রানজেকশন হিস্টরি
db.ref('app_data/history').on('value', snapshot => {
  const history = snapshot.val() || [];
  const box = document.getElementById('historyList');
  box.innerHTML = "";
  if(history.length===0){
      box.innerHTML="<p>কোনো ট্রানজেকশন নেই।</p>";
  } else {
      history.forEach((h,i)=>{
          const p = document.createElement('p');
          p.textContent = `${toBanglaNumber(i+1)}. ${h}`;
          box.appendChild(p);
      });
  }
});

// 🔹 টাকা পাঠানো
function sendMoney(){
  const num = document.getElementById('sendNumber').value;
  const amount = Number(document.getElementById('sendAmount').value);
  const result = document.getElementById('sendResult');
  if(num && amount>0){
      const entry = { number: num, amount: amount, status: "pending" };
      db.ref('app_data/premiumRequests').once('value', snap=>{
          let requests = snap.val() || [];
          requests.push(entry);
          db.ref('app_data/premiumRequests').set(requests);
      });
      result.textContent = `${num} নাম্বারে ${toBanglaNumber(amount)} টাকা এড করার রিকোয়েস্ট পাঠানো হয়েছে ✅`;
      document.getElementById('sendNumber').value = "";
      document.getElementById('sendAmount').value = "";
  } else {
      result.textContent = "অনুগ্রহ করে নাম্বার ও পরিমাণ দিন ❌";
  }
}

// 🔹 এডমিন অ্যাকশন ট্র্যাকিং
let processedRequests = {};
db.ref('app_data/premiumRequests').on('value', snap=>{
  const requests = snap.val() || [];
  requests.forEach((req, index)=>{
      if(processedRequests[index]) return;
      if(req.status === "accepted"){
          db.ref('app_data/balance').transaction(b=>{
              b = b || 0;
              return b + Number(req.amount);
          });
          db.ref('app_data/history').transaction(h=>{
              h = h || [];
              h.push(`✅ ${req.number} নাম্বারে ${toBanglaNumber(req.amount)} টাকা অ্যাড হয়েছে`);
              return h;
          });
          processedRequests[index] = true;
      }
      else if(req.status === "rejected" || req.status === "deleted"){
          db.ref('app_data/history').transaction(h=>{
              h = h || [];
              h.push(`❌ ${req.number} নাম্বারের ${toBanglaNumber(req.amount)} টাকা রিকুয়েস্ট বাতিল হয়েছে`);
              return h;
          });
          processedRequests[index] = true;
      }
  });
});

// 🔹 ব্যালেন্স পরিবর্তন ট্র্যাকিং
let lastBalance = 0;
db.ref('app_data/balance').on('value', snapshot => {
  const newBal = snapshot.val() || 0;
  if(lastBalance !== 0) {
      const diff = newBal - lastBalance;
      if(diff > 0){
          db.ref('app_data/history').transaction(h=>{
              h = h || [];
              h.push(`💰 ${toBanglaNumber(diff)} টাকা ব্যালেন্সে যোগ হয়েছে`);
              return h;
          });
      } else if(diff < 0){
          db.ref('app_data/history').transaction(h=>{
              h = h || [];
              h.push(`💸 ${toBangলাNumber(Math.abs(diff))} টাকা ব্যালেন্স থেকে কেটে নেওয়া হয়েছে`);
              return h;
          });
      }
  }
  lastBalance = newBal;
});

// 🔹 প্যাকেজ কেনা
function buyPackage(price, name){
  db.ref('app_data/balance').transaction(bal=>{
      bal = bal || 0;
      if(bal>=price){
          const newBal = bal - price;
          db.ref('app_data/history').transaction(h=>{
              h = h || [];
              h.push(`📦 ${name} প্যাকেজ কেনা হয়েছে (${toBanglaNumber(price)} টাকা কাটা হয়েছে)`);
              return h;
          });
          return newBal;
      } else {
          alert("যথেষ্ট ব্যালেন্স নেই ❌");
          return bal;
      }
  });
}