# 🗑️ Clear Old Mock Data

## ✅ **How to Clear Old Data and Start Fresh**

Your mock data has been updated with new cinema chains, but you need to clear the old localStorage data to see the changes.

---

## 🔧 **Method 1: Browser DevTools (Recommended)**

### **Chrome/Edge/Brave:**
1. Open your app (http://localhost:5173 or your dev URL)
2. Press `F12` to open DevTools
3. Go to **Application** tab
4. In left sidebar, expand **Local Storage**
5. Click on your domain (e.g., `http://localhost:5173`)
6. **Right-click** and select **"Clear"**
7. **Refresh** the page (`F5` or `Cmd+R`)

### **Firefox:**
1. Open your app
2. Press `F12` to open DevTools  
3. Go to **Storage** tab
4. In left sidebar, expand **Local Storage**
5. Click on your domain
6. **Right-click** and select **"Delete All"**
7. **Refresh** the page

### **Safari:**
1. Open your app
2. Press `Cmd+Option+C` to open Web Inspector
3. Go to **Storage** tab
4. Click **Local Storage** → your domain
5. Click **"Delete All"**
6. **Refresh** the page

---

## 🔧 **Method 2: Console Command (Fastest!)**

1. Open your app
2. Press `F12` (or `Cmd+Option+C` on Mac)
3. Go to **Console** tab
4. Paste this command and press Enter:

```javascript
localStorage.clear();
location.reload();
```

**Done!** The page will refresh with fresh data.

---

## 🔧 **Method 3: Add a Clear Button (Permanent Solution)**

Add this button to your app's header or settings:

```tsx
// In your App.tsx or a settings component
<button
  onClick={() => {
    if (confirm('Clear all data and reset? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }}
  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
>
  🗑️ Clear All Data
</button>
```

---

## ✅ **What You'll See After Clearing:**

### **New Cinema Chains:**
1. **PVR Phoenix Mall Mumbai** (3 Audis)
   - Audi 1: Christie CP2220
   - Audi 2: Christie CP2220  
   - Audi 3: Barco DP2K-20C

2. **PVR Select CityWalk Delhi** (3 Audis)
   - Audi 1: Christie CP2220
   - Audi 2: NEC NC1200C
   - Audi 3 IMAX: Barco DP4K-32B

3. **INOX Garuda Mall Bangalore** (2 Audis)
   - Screen 1: Christie CP2220
   - Screen 2: Sony SRX-R515P

4. **Cinepolis Seasons Mall Pune** (2 Audis)
   - Audi 1: NEC NC1200C
   - Audi 2: Christie CP2220

5. **Carnival Cinemas Forum Sujana Mall Hyderabad** (3 Audis)
   - Screen 1: Barco DP2K-15C
   - Screen 2: Christie CP2220
   - Screen 3: NEC NC1200C

### **Key Features:**
- ✅ **Multiple projectors with same model** (6x Christie CP2220!)
- ✅ **Different serial numbers** for each projector
- ✅ **Real cinema chain names** (PVR, INOX, Cinepolis, Carnival)
- ✅ **Cinema-appropriate naming** (Audi 1, Screen 1, Theater 1)
- ✅ **No old DTR/RMA cases** - Start creating fresh ones!

---

## 🧪 **Test the New Data:**

### **1. Test Master Data:**
- Go to **Master Data** tab
- You should see 5 cinema sites
- Click on any site to see audis
- Each audi should have a projector

### **2. Create Test DTR:**
- Go to **DTR Cases** → **+ Create DTR**
- Select Site: "PVR Phoenix Mall Mumbai"
- Select Audi: "Audi 1"
- Product should auto-fill: "Christie CP2220"
- Serial should auto-fill: "CP2220-MUM-A1-001"
- ✅ Create the case!

### **3. Create Test RMA:**
- Go to **RMA Cases** → **+ Create RMA**
- Try new RMA Type: **"SRMA"**
- Leave RMA Number empty (it's optional now!)
- Select Site and Audi
- Check **DNR** checkbox → Return tracking fields disappear!
- ✅ Create the case!

### **4. Test Sequential Status:**
- View an RMA case
- Should see only **NEXT** status button
- Status: Open → Shows "RMA Raised - Yet to Deliver" button
- Click it → Now shows "Faulty in Transit to CDS" button
- ✅ Sequential workflow working!

---

## ⚠️ **Important Notes:**

1. **All your old data will be deleted** - This is intentional to start fresh
2. **Users remain** - The admin user (admin@crm.com / Admin@123) will still exist
3. **No DTR/RMA cases initially** - You'll create new ones with the updated features
4. **Master data auto-loads** - The 5 cinema chains load automatically

---

## 🎯 **Why Clear Data?**

The old mock data has:
- ❌ Old site names (ABC Conference Center, XYZ Corporate HQ)
- ❌ Old RMA types (CI RMA instead of RMA_CL)
- ❌ Old statuses (pending, approved, in-transit, completed)
- ❌ No DNR data
- ❌ Single projectors per model
- ❌ Non-cinema naming

The new mock data has:
- ✅ Real cinema chains (PVR, INOX, Cinepolis, Carnival)
- ✅ Multiple Christie CP2220 projectors (6 total!)
- ✅ New RMA types (RMA, SRMA, RMA_CL, Lamps)
- ✅ New statuses (open, rma_raised_yet_to_deliver, faulty_in_transit_to_cds, closed)
- ✅ DNR support
- ✅ Cinema-appropriate naming

---

## ✅ **Ready to Test!**

1. Clear localStorage using one of the methods above
2. Refresh your app
3. Go to Master Data → See 5 cinema chains ✨
4. Create new DTR/RMA cases with all the new features!

**🎉 You now have a production-ready testing environment!**




