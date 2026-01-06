# 🗑️ Delete Test Attachments Guide

## Quick Options

### Option 1: Delete Through UI (Recommended for Few Files)

1. **Open the RMA/DTR case** that has test files
2. **Scroll to "Attachments" section**
3. **Click the trash icon** (🗑️) next to each file
4. **Confirm deletion**
5. Files will be deleted from:
   - ✅ Cloudinary
   - ✅ Local disk
   - ✅ Database

### Option 2: Use Script (Recommended for Many Files)

Use the provided script to bulk delete test attachments.

---

## 📋 Script Usage

### Preview What Will Be Deleted (Dry Run)

```bash
cd backend

# Preview attachments for specific case
npm run delete:attachments -- --case-id 7065921 --dry-run

# Preview all test files
npm run delete:attachments -- --file-name test --dry-run

# Preview all RMA attachments
npm run delete:attachments -- --case-type RMA --dry-run
```

### Delete Attachments

```bash
cd backend

# Delete all attachments for case 7065921
npm run delete:attachments -- --case-id 7065921

# Delete all files with "test" in the name
npm run delete:attachments -- --file-name test

# Delete all attachments for a specific case type
npm run delete:attachments -- --case-type RMA
```

### Script Options

| Option | Description | Example |
|--------|-------------|---------|
| `--case-id <id>` | Delete attachments for specific case | `--case-id 7065921` |
| `--case-type <type>` | Filter by case type (DTR or RMA) | `--case-type RMA` |
| `--file-name <name>` | Filter by file name (partial match) | `--file-name test` |
| `--dry-run` | Preview without deleting | `--dry-run` |
| `--all` | Delete without confirmation | `--all` |
| `--help` | Show help message | `--help` |

---

## 🎯 Common Scenarios

### Delete All Test Files for Case 7065921

```bash
cd backend
npm run delete:attachments -- --case-id 7065921
```

### Delete All Test Files (Any Case)

```bash
cd backend
npm run delete:attachments -- --file-name test
```

### Preview Before Deleting

```bash
cd backend
# Preview first
npm run delete:attachments -- --case-id 7065921 --dry-run

# Then delete
npm run delete:attachments -- --case-id 7065921
```

### Delete All Attachments (Use with Caution!)

```bash
cd backend
npm run delete:attachments -- --all
```

---

## ⚠️ Important Notes

1. **Deletion is permanent** - Files cannot be recovered
2. **Always use `--dry-run` first** to preview what will be deleted
3. **Script deletes from:**
   - Cloudinary (if uploaded)
   - Local disk (if exists)
   - Database
4. **You need admin/manager role** to delete files uploaded by others
5. **Files you uploaded** can always be deleted

---

## 🔍 What Gets Deleted

When you delete an attachment:

1. **Cloudinary**: File removed from Cloudinary storage
2. **Local Disk**: File removed from `backend/uploads/` directory
3. **Database**: Record removed from `case_attachments` table

---

## 📊 Example Output

```
📋 Found 3 attachment(s) to delete:

1. test-image.jpg
   Case: RMA - 7065921
   Size: 245.67 KB
   Type: image
   Cloudinary: ✅ Yes
   Local: ✅ Yes

2. test-document.pdf
   Case: RMA - 7065921
   Size: 1024.00 KB
   Type: document
   Cloudinary: ✅ Yes
   Local: ✅ Yes

3. test-log.zip
   Case: RMA - 7065921
   Size: 512.34 KB
   Type: log
   Cloudinary: ✅ Yes
   Local: ✅ Yes

🗑️  Deleting: test-image.jpg...
   ✅ Deleted from Cloudinary
   ✅ Deleted local file
   ✅ Deleted from database

📊 Deletion Summary:
   Total found: 3
   ✅ Deleted from database: 3
   ✅ Deleted from Cloudinary: 3
   ✅ Deleted local files: 3
```

---

## 🚀 Quick Start

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Preview what will be deleted:**
   ```bash
   npm run delete:attachments -- --case-id 7065921 --dry-run
   ```

3. **Delete the files:**
   ```bash
   npm run delete:attachments -- --case-id 7065921
   ```

4. **Verify in Cloudinary dashboard** - files should be removed

---

**That's it!** Your test files will be completely removed from Cloudinary, local storage, and the database.

