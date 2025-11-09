# Extension Store Submission Guides

Complete step-by-step instructions for submitting HighlightAssist to all major browser extension stores.

---

## 📦 Before You Start

### Required Assets Checklist

✅ **Extension Package**
- [ ] `dist/HighlightAssist-v1.0.0.zip` (22 KB)

✅ **Icons**
- [ ] `icons/icon16.png`
- [ ] `icons/icon32.png`
- [ ] `icons/icon48.png`
- [ ] `icons/icon128.png`

✅ **Promotional Graphics** (Take screenshots as per `SCREENSHOTS.md`)
- [ ] Large promotional tile (1280x800) - Chrome only
- [ ] Small promotional tile (640x400) - Chrome only
- [ ] 3-5 screenshots (1280x800 recommended)

✅ **Copy/Paste Content**
- [ ] Read `STORE_LISTING.md` for descriptions
- [ ] Privacy policy ready

---

## 🌐 Chrome Web Store

### Prerequisites
- Google account
- $5 one-time developer registration fee
- Valid payment method

### Step-by-Step Submission

#### 1. Register as a Chrome Web Store Developer

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Accept the Developer Agreement
3. Pay the $5 registration fee
4. Wait for payment verification (usually instant)

#### 2. Create New Item

1. Click **"New Item"** button
2. Click **"Choose file"** and select `dist/HighlightAssist-v1.0.0.zip`
3. Click **"Upload"**
4. Wait for upload to complete

#### 3. Fill Out Store Listing

**Product Details:**
- **Name:** `HighlightAssist - Element Inspector for Vite`
- **Summary:** (Copy from `STORE_LISTING.md` - Chrome Web Store section)
- **Description:** (Copy from `STORE_LISTING.md` - Chrome Web Store section)
- **Category:** Select "Developer Tools"
- **Language:** English

**Privacy:**
- Click **"Add"** under Privacy practices
- **Does your extension use remote code?** No
- **Does your extension collect user data?** No
- **Privacy Policy URL:** `https://github.com/Skullcandyxxx/HighlightAssist#privacy-policy`

**Promotional Graphics:**
- **Icon:** Upload `icons/icon128.png`
- **Small promotional tile (440x280):** Upload your screenshot (will auto-resize)
- **Marquee promotional tile (1400x560):** Upload promotional graphic
- **Screenshots:** Upload 3-5 screenshots (1280x800)

**Distribution:**
- **Visibility:** Public
- **Regions:** All regions

**Pricing:**
- **Free**

#### 4. Submit for Review

1. Review all information
2. Click **"Submit for Review"**
3. Wait 1-3 days for review
4. Check email for approval/rejection

#### 5. After Approval

- Extension will be live at: `https://chrome.google.com/webstore/detail/[your-extension-id]`
- Share the link!
- Monitor reviews and ratings

---

## 🔴 Opera Addons

### Prerequisites
- Opera account (free)
- No registration fee

### Step-by-Step Submission

#### 1. Create Developer Account

1. Go to [Opera Addons Developer Portal](https://addons.opera.com/developer/)
2. Sign in with your Opera account (or create one)
3. Accept the Developer Agreement

#### 2. Upload Extension

1. Click **"Upload extension"**
2. Select `dist/HighlightAssist-v1.0.0.zip`
3. Wait for automated tests to complete

#### 3. Fill Out Package Details

**Basic Information:**
- **Name:** `HighlightAssist - Vite Element Inspector`
- **Summary:** (Copy from `STORE_LISTING.md` - Opera section)
- **Description:** (Copy from `STORE_LISTING.md` - Opera section)
- **Category:** Developer Tools
- **License:** MIT (link to your GitHub)

**Support:**
- **Homepage:** `https://github.com/Skullcandyxxx/HighlightAssist`
- **Support page:** `https://github.com/Skullcandyxxx/HighlightAssist/issues`
- **Support email:** `glfalliance@gmail.com`

**Media:**
- **Icon:** Upload `icons/icon128.png`
- **Screenshots:** Upload 3-5 screenshots

**Version Information:**
- **Version:** 1.0.0
- **Changelog:** Initial release

**Privacy:**
- **Privacy Policy URL:** `https://github.com/Skullcandyxxx/HighlightAssist#privacy-policy`

#### 4. Submit for Review

1. Click **"Submit for moderation"**
2. Wait 1-5 days for review
3. Check email for approval

#### 5. After Approval

- Extension will be live at: `https://addons.opera.com/extensions/details/[your-extension-slug]`
- Opera GX users can install directly!

---

## 🦊 Firefox Add-ons (AMO)

### Prerequisites
- Firefox account (free)
- No registration fee

### Step-by-Step Submission

#### 1. Create Developer Account

1. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Sign in with Firefox account (or create one)
3. Read and accept the Developer Agreement

#### 2. Submit New Add-on

1. Click **"Submit a New Add-on"**
2. Choose **"On this site"** (recommended for discoverability)
3. Click **"Continue"**

#### 3. Upload Your Add-on

1. Click **"Select a file..."**
2. Select `dist/HighlightAssist-v1.0.0.zip`
3. Wait for automated validation
4. **Important:** Fix any warnings/errors
   - If there are manifest V3 compatibility issues, you may need to create a separate Firefox version

#### 4. Fill Out Listing Details

**Describe your add-on:**
- **Name:** `HighlightAssist - Vite Element Inspector`
- **Add-on URL:** `highlightassist` (or your preferred slug)
- **Summary:** (Copy from `STORE_LISTING.md` - Firefox section)
- **Description:** (Copy from `STORE_LISTING.md` - Firefox section, use Markdown)
- **Categories:** Developer Tools
- **Tags:** vite, developer tools, debugging, element inspector

**Add-on icon:**
- Upload `icons/icon128.png`

**Screenshots:**
- Upload 3-5 screenshots with captions

**Privacy & Legal:**
- **Privacy Policy:** Paste content from `STORE_LISTING.md` Privacy Policy section
- **License:** MIT License
- **Homepage:** `https://github.com/Skullcandyxxx/HighlightAssist`
- **Support email:** `glfalliance@gmail.com`
- **Support site:** `https://github.com/Skullcandyxxx/HighlightAssist/issues`

**Distribution:**
- **Listed on this site**

#### 5. Submit for Review

1. Review all information
2. Click **"Submit Version"**
3. Wait 1-7 days for review (Firefox reviews are thorough)
4. Check email for approval/questions

#### 6. After Approval

- Extension will be live at: `https://addons.mozilla.org/firefox/addon/highlightassist/`
- Update your GitHub README with install links!

---

## 📝 Post-Submission Checklist

After your extension is approved on all stores:

### Update Your GitHub README

Add installation links for all three stores:

```markdown
## Installation

### Chrome / Edge / Brave
[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/[your-id])

### Opera / Opera GX
[Install from Opera Addons](https://addons.opera.com/extensions/details/[your-slug])

### Firefox
[Install from Firefox Add-ons](https://addons.mozilla.org/firefox/addon/highlightassist/)
```

### Monitor & Maintain

- **Check reviews** regularly on all stores
- **Respond to user feedback** within 24-48 hours
- **Update privacy policy** if you add new features
- **Version updates** require re-submission to each store
- **Star your own repo** on GitHub 😉

---

## 🆘 Troubleshooting

### Common Issues

**Chrome: "Manifest version not supported"**
- Our extension uses Manifest V3 which is fully supported
- Make sure you're uploading the correct zip file

**Opera: "Extension already exists"**
- Check if someone else has uploaded a similar extension
- Consider a slightly different name

**Firefox: "Manifest V3 warnings"**
- Firefox has limited Manifest V3 support
- You may need to create a Manifest V2 version for Firefox
- Use browser-specific manifests if needed

**All: "Privacy policy required"**
- Link to GitHub README privacy section
- Or create a dedicated privacy.html page

**All: "Screenshots too large"**
- Resize to 1280x800 maximum
- Compress with online tools like TinyPNG

### Need Help?

- **Chrome Web Store:** [Help Center](https://developer.chrome.com/docs/webstore/program-policies/)
- **Opera Addons:** [Developer FAQ](https://dev.opera.com/extensions/)
- **Firefox Add-ons:** [Developer Hub](https://extensionworkshop.com/)
- **Email Support:** glfalliance@gmail.com

---

## 🎉 Success Tips

1. **Clear descriptions** - Users should understand what your extension does in 5 seconds
2. **Great screenshots** - Show the extension in action, not just the popup
3. **Respond to reviews** - Engaged developers get better ratings
4. **Update regularly** - Even small bug fixes show the extension is maintained
5. **Cross-promote** - Link between your Chrome/Opera/Firefox listings

Good luck with your submission! 🚀
