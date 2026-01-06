# 📋 Template Management Guide

## Where to Create Templates

You can create and manage templates from the **"Templates"** tab in the main navigation!

### Access Templates Page

1. **From Navigation Bar:**
   - Click on the **"Templates"** tab in the top navigation
   - This will take you to the Template Management page

2. **From Forms:**
   - When creating a DTR or RMA case, you'll see a template selector
   - Click the **"Manage"** link next to the template dropdown
   - This will take you directly to the Templates page

## Creating a Template

### Step 1: Navigate to Templates
- Click **"Templates"** in the navigation bar
- Or click **"Manage"** link in the template selector when creating a case

### Step 2: Select Case Type
- Choose **"DTR Templates"** or **"RMA Templates"** from the dropdown at the top

### Step 3: Create New Template
- Click the **"Create Template"** button
- Fill in the template details:
  - **Template Name** (required) - e.g., "Common Issue Template"
  - **Description** (optional) - Describe when to use this template
  - **Make Public** - Check if you want all users to see this template
  - **Template Fields** - Pre-fill common values for form fields

### Step 4: Add Pre-filled Values
- For each field you want to pre-fill, enter a default value
- Leave fields empty if you don't want to pre-fill them
- Only filled fields will be applied when using the template

### Step 5: Save Template
- Click **"Save Template"** button
- Your template is now ready to use!

## Using Templates

### In DTR Form:
1. When creating a new DTR case, look for **"Use Template (Optional)"** section
2. Select a template from the dropdown
3. The form will automatically fill with the template's pre-filled values
4. You can still modify any fields after applying the template

### In RMA Form:
1. When creating a new RMA case, look for **"Use Template (Optional)"** section
2. Select a template from the dropdown
3. The form will automatically fill with the template's pre-filled values
4. You can still modify any fields after applying the template

## Managing Templates

### View Templates
- **My Templates** - Templates you created
- **Public Templates** - Templates shared by other users

### Edit Template
- Click the **"Edit"** button on your template card
- Modify the template details
- Click **"Save Template"** to update

### Make Template Public/Private
- Click the **Globe/Lock** icon on your template card
- Public templates can be used by all users
- Private templates are only visible to you

### Delete Template
- Click the **"Delete"** button (trash icon) on your template card
- Confirm the deletion
- ⚠️ This action cannot be undone

## Template Fields

### DTR Template Fields:
- `natureOfProblem` - Nature of Problem
- `actionTaken` - Action Taken
- `remarks` - Remarks
- `callStatus` - Call Status
- `caseSeverity` - Case Severity

### RMA Template Fields:
- `defectDetails` - Defect Details
- `symptoms` - Symptoms
- `defectivePartName` - Defective Part Name
- `defectivePartNumber` - Defective Part Number
- `replacedPartNumber` - Replaced Part Number
- `notes` - Notes
- `status` - Status

## Tips

1. **Create Common Templates:**
   - Create templates for frequently encountered issues
   - This will speed up case creation significantly

2. **Use Descriptive Names:**
   - Name templates clearly so you can find them easily
   - e.g., "High Priority Issue", "Common Lamp Failure"

3. **Share Useful Templates:**
   - Make templates public if they're useful for the whole team
   - This helps standardize case creation

4. **Template Usage Tracking:**
   - Templates show usage count
   - This helps identify which templates are most useful

5. **Partial Pre-filling:**
   - You don't need to fill all fields
   - Only pre-fill fields that are commonly the same
   - Leave other fields empty for manual entry

## Example Templates

### DTR Template Example:
- **Name:** "Common Lamp Failure"
- **Fields:**
  - `natureOfProblem`: "Lamp failure - no display"
  - `caseSeverity`: "medium"
  - `callStatus`: "open"

### RMA Template Example:
- **Name:** "Standard RMA Process"
- **Fields:**
  - `status`: "open"
  - `notes`: "Standard RMA process initiated"

---

**🎉 Happy Template Creating!**

