# GuideSnap Test Cases

---

## feat: Optional "Include page URLs" checkbox (Export Panel)

### TC-01 — Checkbox appears in Options section
**What is being tested:** The new "Include page URLs" checkbox renders in the Export panel under the existing three checkboxes.

**Steps to verify:**
1. Build the extension: `npm run build`
2. Load unpacked from `dist/` at `chrome://extensions/`
3. Record a guide with at least 2 steps on any webpage
4. Open the GuideSnap popup → select the guide → click Export
5. Scroll to the **Options** section

**Expected result:** Four checkboxes visible in order:
- Include step descriptions ✓
- Include step numbering ✓
- Use annotated screenshots ✓
- Include page URLs ✓ ← new, checked by default

---

### TC-02 — HTML export includes URL when checkbox is checked
**What is being tested:** URL appears in the exported HTML file when "Include page URLs" is enabled.

**Steps to verify:**
1. In the Export panel, ensure "Include page URLs" is **checked**
2. Select format **HTML** and click Export
3. Open the downloaded `.html` file in a browser
4. Inspect each step's metadata line below the screenshot

**Expected result:** Each step shows `PageTitle — https://...` in small gray text below the screenshot.

---

### TC-03 — HTML export omits URL when checkbox is unchecked
**What is being tested:** URL is hidden from HTML export when the option is disabled.

**Steps to verify:**
1. In the Export panel, **uncheck** "Include page URLs"
2. Select format **HTML** and click Export
3. Open the downloaded `.html` file
4. Inspect each step

**Expected result:** No URL or page title metadata line appears anywhere in the exported HTML.

---

### TC-04 — DOCX export includes URL when checkbox is checked
**What is being tested:** URL appears as a gray italic line in the exported Word document.

**Steps to verify:**
1. Ensure "Include page URLs" is **checked**
2. Select format **DOCX** and click Export
3. Open the `.docx` file in Word or Google Docs
4. Check below each step's description

**Expected result:** Each step has a small gray italic line: `PageTitle — https://...`

---

### TC-05 — DOCX export omits URL when checkbox is unchecked
**What is being tested:** URL line is absent from DOCX when option is disabled.

**Steps to verify:**
1. **Uncheck** "Include page URLs"
2. Select format **DOCX** and click Export
3. Open the `.docx` file

**Expected result:** No URL metadata line appears in any step.

---

### TC-06 — URL and step numbering are independent
**What is being tested:** The "Include page URLs" and "Include step numbering" checkboxes do not affect each other.

**Steps to verify:**
1. **Uncheck** "Include step numbering", keep "Include page URLs" **checked**
2. Export to HTML
3. Open the file → confirm step numbers are gone but URLs are still present
4. Return to export panel: **check** "Include step numbering", **uncheck** "Include page URLs"
5. Export to HTML again
6. Open the file → confirm step numbers are present but URLs are gone

**Expected result:** Each option controls only its own content; they are fully independent.

---

### TC-07 — PDF export is unaffected
**What is being tested:** The PDF export never showed URLs and still does not, regardless of the checkbox state.

**Steps to verify:**
1. Check "Include page URLs", select format **PDF**, export
2. Open the PDF and inspect each page

**Expected result:** No URL text appears in the PDF (URL display was never implemented for PDF).

---

## fix: DOCX export — remove forced page breaks between steps

### TC-08 — Steps flow continuously without forced page breaks
**What is being tested:** Exporting a guide as DOCX no longer places each step on its own page.

**Steps to verify:**
1. Record a guide with 3 or more steps
2. Open the Export panel, select format **Word (.docx)**, click Export
3. Open the downloaded `.docx` file in Word or LibreOffice Writer

**Expected result:** All steps appear in a continuous flow on as few pages as needed; no artificial blank space or forced page-per-step layout.

### TC-09 — Visual divider separates steps
**What is being tested:** A subtle horizontal rule appears between each step to maintain readability.

**Steps to verify:**
1. Export a 3-step guide as DOCX
2. Open the file and scroll through the content

**Expected result:** A light grey horizontal line is visible between each pair of consecutive steps; the last step has no trailing divider.

### TC-10 — Step heading stays with its content at natural page breaks
**What is being tested:** `keepNext` ensures step headings and descriptions are not orphaned at the bottom of a page.

**Steps to verify:**
1. Export a guide with enough steps to span multiple pages naturally
2. Open the DOCX and find any step that begins near the bottom of a page

**Expected result:** The "Step X of Y" heading and description text move together with the screenshot to the next page rather than being split across pages.

### TC-11 — Cover page still has its own page
**What is being tested:** The cover page page-break is preserved; only inter-step breaks are removed.

**Steps to verify:**
1. Export any guide as DOCX
2. Open the file

**Expected result:** The cover page (title, subtitle, date, step count) occupies its own page; step content begins on page 2.
