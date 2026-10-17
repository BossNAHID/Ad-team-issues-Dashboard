/* isf-form.js
   "Send to ISF" -> opens the Google Form "Issue Escalation" prefilled.
   Load AFTER the main <script> in index.html:  <script src="isf-form.js"></script>
   Auto-filled : Consignment, Hub (from dashboard), Details (from dashboard), Channel = KAM, Status = Pending
   Selected    : Zone, Issue Category, Issue Sub Category
   Manual      : tick "Record email" and press Submit on the form (Google does not allow prefilling those) */
(function () {
  'use strict';

  // ===== CONFIG: change ISF_FORM_URL when the monthly form changes =====
  const ISF_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfiQrKXWA9eKQgwxGqDu_oDhqgnbzMzjA507FS1tj1rjHCQLA/viewform';

  // Open the form, press F12, run in Console:
  //   FB_PUBLIC_LOAD_DATA_[1][1].map(q => [q[1], 'entry.' + q[4]?.[0]?.[0]])
  // and paste each entry.NNNN below.
  const ISF_ENTRY = {
    consignment: 'entry.XXXX', // Consignment ID/Merchant Name
    channel:     'entry.XXXX', // Channel
    zone:        'entry.XXXX', // Zone
    hub:         'entry.XXXX', // Concern Hub
    status:      'entry.XXXX', // Issue Status
    category:    'entry.XXXX', // Issue Category
    subCategory: 'entry.XXXX', // Issue Sub Category
    details:     'entry.XXXX'  // Issue Details
  };

  // IDs saved through the one-time setup box in the popup (no file editing needed)
  try {
    const saved = JSON.parse(localStorage.getItem('isf-entry-ids') || 'null');
    if (saved && typeof saved === 'object') {
      Object.keys(ISF_ENTRY).forEach(k => {
        if (!/^entry\.\d+$/.test(ISF_ENTRY[k]) && /^entry\.\d+$/.test(saved[k] || '')) ISF_ENTRY[k] = saved[k];
      });
    }
  } catch (e) { /* ignore */ }

  const ISF_ZONES = ['ISD', 'OSD', 'RSD', 'CTG', 'Central short'];

  const ISF_CATEGORIES = ['Execution Request','Forcefully Taken','Inquiry','Panel Status','Complain Why Return','Coverage/Point Delivery','Delivery Delay','Payment Issue','Pickup','Return Delay','Return Exchange','Reverse Pickup','Charge Extra/Wrong COD','Damage','No Entry/Cancelled','Unprofessionalism','Wrong Routing','Wrong Tag/Parcel Swapped','Breach of CLOSEBOX','Urgent Delivery'];

  const ISF_SUBCATEGORIES = Array.from(new Set(["Order Cancellation Request","Price Updatation Request","Customer Address Update","Customer Contact Update","Payment Info Update","Profile Info Update","Profile Password Update","Store Approval","Store Info Update","Hold Request","Partial Delivery Request - Special Instruction","Uninformed Info Change","Agent Details Missing/Wrong Number","Fraudulent Activity","Delivery/Return","Delivery Hold","Order Info/Status","Coverage Area","Feedback/Suggestion","Courier Service","Silent Call/Chat","Merchant Panel/App","Interested to Join as Agent","Interested to Join As Merchant","Other Vertical Transfer","Payment Process Courier","CarryBee Outbound Call","Pickup Entry","Reverse Pickup","Return Exchange","Extra Charge Offered","Extra Charge Demanded","Wrong COD Collection","Wrong Weight Input","Miscalculation of Weight Charge","Miscalculation of Delivery/Return Charge","Miscalculation of COD Charge","Poor Packaging","Not Processed Under Fragile Category","Act of God","Defective Product Sent By Merchant","Liquid Leakage","Stapler Pin","Rat Bites","Mishandling","Trackless","Parcel Lost By OPS","Hijacking/Robbery","Poor Packaging","Empty Package/Empty Packet/Empty Box","Partial Missing","Double Entry","No Entry","Info Mismatch","Product Not Given By Merchant","Misbehavior By PA","Misbehavior By DA","Misbehavior By Employee","Incomplete/Wrong Info Input On Panel","Wrong Routing By Processing Team","Wrong POD Attached","Technical Error","Wrong Tag By LMH","Wrong Tag By FMH","Wrong Tag By Processing Team","Wrong Invoice Attached By Merchant","Forcefully Checked By Customer","POD Not Followed By Agent","Agent/Hub Didn't Update Status Timely","Wrong Status","Technical Error","Improper Delivery Attempt","Merchant Not Informed Before Returning","False Return Note","Reprocess Request by Merchant","Agent Denies Home Delivery","Rescheduled By Customer/Customer Unreachable","Remote Area","Delivery Not Attempted By Agent","False Hold Note","Processing Delay","Rider Shortage","Delivery Delay - On Demand","Urgent Delivery","Hub Payment Not Submitted","Cash Lost By OPS","Invoice Not Generated","Invoice Generated But Payment Not Disbursed","Pickup Request","Rider Shortage","Pickup Timing Issue","Pickup Request - On Demand","Pickup Not Attempted By Agent","Processing Delay","Merchant Unreachable/Store Closed","Return ID Not Created","POD Not Followed By Agent","Exchange Not Provided By Customer","Return ID Not Created","Rider Unreachable"]));

  // "Concern Hub" options exactly as the form lists them
  const ISF_HUBS = ["60 Feet","B.Baria-Akhaura","B.Baria-Bancharampur","B.Baria-Kasba","B.Baria-Nabinagar","B.Baria-Nasirnagar","B.Baria-Sadar","Badda","Bagerhat-Mongla","Bagerhat-Morrelganj","Bagerhat-Sadar","Bandarban-Sadar","Barguna-Sadar","Barisal-Bakerganj","Barisal-Gournadi","Barisal-Muladi","Barishal Sub Sort","Barishal-Sadar","Bhairab Sub Sort","Bhanga Sub Sort","Bhola-Charfassion","Bhola-Sadar","Bhulta-Gawsia","Bogra-Dhupchanchia","Bogra-Sadar","Bogra-Sherpur","Central IB","Central Return","Central Sort","Chandpur-Faridganj","Chandpur-Hajiganj","Chandpur-Kachua","Chandpur-Matlab Dakshin","Chandpur-Sadar","Chandpur-Shahrasti","Chapainawabganj-Sadar","Chapainawabganj-Shibganj","Chuadanga-Sadar","Comilla Sub Sort","Comilla-Barura","Comilla-Brahmanpara","Comilla-Burichang","Comilla-Chandina","Comilla-Chauddagram","Comilla-Daudkandi","Comilla-Laksam","Comilla-Muradnagar","Comilla-Nangalkot","Comilla-Sadar","Cox's Bazar-Chakaria","Cox's Bazar-Maheshkhali","Cox's Bazar-Ramu","Cox's Bazar-Sadar","Cox's Bazar-Teknaf","Cox's Bazar-Ukhia","CTG Sub Sort","CTG-Anwara","CTG-Banshkhali","CTG-Fatikchari","CTG-Halishahar","CTG-Hathazari","CTG-Mirsarai","CTG-Nasirabad","CTG-Patenga","CTG-Patiya","CTG-Rangunia","CTG-Raozan","CTG-Satkania","CTG-Sitakunda","Demra","Dhonia","Diabari","Dinajpur-Birganj","Dinajpur-Nawabganj","Dinajpur-Sadar","Dohar-Nawabganj","Faridpur-Bhanga","Faridpur-Boalmari","Faridpur-Sadar","Feni-Chhagalnaiya","Feni-Daganbhuya","Feni-Sadar","Feni-Sonagazi","Gaibandha-Gobindaganj","Gaibandha-Sadar","Gazipur-Boardbazar","Gazipur-Joydebpur","Gazipur-Kaliganj","Gazipur-Kapasiya","Gazipur-Mawna","Gazipur-Mouchak","Gopalganj-Muksudpur","Gopalganj-Sadar","Habiganj-Chunarughat","Habiganj-Madhabpur","Habiganj-Nabiganj","Habiganj-Sadar","Jamalpur-Dewanganj","Jamalpur-Sadar","Jashore Sub Sort","Jatrabari","Jessore-Abhaynagar","Jessore-Manirampur","Jessore-Sadar","Jessore-Sharsha","Jhalokathi-Sadar","Jhenaidah-Maheshpur","Jhenaidah-Sadar","Joypurhat-Sadar","Kamrangirchar","Keraniganj","Keraniganj-Ati Bazar","Khagrachari-Sadar","Khilgaon","Khilkhet","Khulna-Dumuria","Khulna-Paikgacha","Khulna-Sadar","Kishoreganj-Bhairab","Kishoreganj-Mithamain","Kishoreganj-Pakundia","Kishoreganj-Sadar","Kolabagan","Kurigram-Sadar","Kushtia-Bheramara","Kushtia-Daulatpur","Kushtia-Sadar","Lakshmipur-Kamalnagar","Lakshmipur-Ramganj","Lakshmipur-Sadar","Lalbagh","Lalmonirhat-Sadar","Lost & Damaged","Madaripur-Sadar","Madaripur-Shibchar","Magura-Sadar","Manikganj-Sadar","Manikganj-Singair","Maulvibazar-Sadar","Meherpur-Sadar","Mohakhali","Mohammadpur","Moulvibazar-Barlekha","Moulvibazar-Kamalganj","Moulvibazar-Kulaura","Moulvibazar-Rajnagar","Moulvibazar-Sreemangal","Munshiganj-Sadar","Munshiganj-Sreenagar","Mymensingh-Bhaluka","Mymensingh-Gaffargaon","Mymensingh-Phulpur","Mymensingh-Sadar","Mymensingh-Trishal","Naogaon-Patnitala","Naogaon-Sadar","Narail-Sadar","Narayanganj","Narayanganj-Araihazar","Narayanganj-Bandar","Narsingdi-Roypura","Narsingdi-Sadar","Narsingdi-Shibpur","Natore-Sadar","Netrakona-Mohonganj","Netrokona-Sadar","Nilphamari-Joldhaka","Nilphamari-Sadar","Nilphamari-Saidpur","Noakhali Sub Sort","Noakhali-Begumganj","Noakhali-Chatkhil","Noakhali-Companiganj","Noakhali-Sadar","Noakhali-Senbagh","Noakhali-Subarnachar","Pabna-Bhangura","Pabna-Ishwardi","Pabna-Sadar","Pallabi","Panchagarh-Sadar","Patuakhali-Galachipa","Patuakhali-Kalapara","Patuakhali-Sadar","Pirojpur-Mathbaria","Pirojpur-Sadar","Rajbari-Sadar","Rajshahi-Puthia","Rajshahi-Sadar","Rangamati-Sadar","Rangpur Sub Sort","Rangpur-Mithapukur","Rangpur-Sadar","Rupganj","Satkhira-Kaliganj","Satkhira-Sadar","Savar","Savar-Baipail","Savar-Dhamrai","Self Inbound","Shariatpur-Damudya","Shariatpur-Sadar","Sherpur-Sadar","Siddhirganj","Sirajganj-Sadar","Sirajganj-Shahjadpur","Sirajganj-Ullapara","Sirajgonj Sub Sort","Sonargaon","Sunamganj-Chhatak","Sunamganj-Derai","Sunamganj-Jagannathpur","Sunamganj-Sadar","Sylhet Sub Sort","Sylhet-Beanibazar","Sylhet-Bishwanath","Sylhet-Dakshin Surma","Sylhet-Fenchuganj","Sylhet-Golapganj","Sylhet-Gowainghat","Sylhet-Jaintiapur","Sylhet-Kanaighat","Sylhet-Osmaninagar","Sylhet-Sadar","Tangail-Ghatail","Tangail-Mirzapur","Tangail-Sadar","Tangail-Sakhipur","Thakurgaon-Sadar","TNL","Uttara","Nadda","Kamranggirchar","Lakshmipur-Raipur","CTG-Bayezid","Comilla-Debidwar","CTG-Bakolia","Mymensingh-Ishwarganj","Munshiganj-Sirajdikhan"];

  // ===== helpers =====
  const entriesConfigured = () => Object.values(ISF_ENTRY).every(v => /^entry\.\d+$/.test(v));
  const isLegacyRec = rec => !!(rec && rec.isfId && !String(rec.isfId).startsWith('FORM-'));
  const isFormRec = rec => !!(rec && rec.isfId && String(rec.isfId).startsWith('FORM-'));
  const $ = id => document.getElementById(id);
  const toast = (m, t) => (typeof showToast === 'function' ? showToast(m, t) : alert(m));
  const hubKey = s => String(s || '').toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
  const HUB_LOOKUP = new Map(ISF_HUBS.map(h => [hubKey(h), h]));

  // Maps whatever the dashboard calls the hub to the exact name the form accepts.
  function matchFormHub(raw) {
    const k = hubKey(raw);
    if (!k) return null;
    return HUB_LOOKUP.get(k) || HUB_LOOKUP.get(k.replace(/\s*(hub|branch|office)$/, '').trim()) || null;
  }

  let cur = null;       // issue currently open in the modal
  let picks = null;     // values chosen before the form was opened

  // ===== modal body (replaces the old Central-API popup content) =====
  function buildBody() {
    const body = document.querySelector('#isfModal .p-6.space-y-4');
    if (!body) return;
    const field = 'width:100%;background-color:var(--bg-modal-content);color:var(--text-primary);border:1px solid var(--border-input);';
    const lbl = 'class="block text-xs uppercase font-semibold mb-1" style="color:var(--text-muted);"';
    const opts = (arr, ph) => `<option value="" disabled selected>${ph}</option>` + arr.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join('');
    body.innerHTML = `
      <div id="isfSentInfo" class="hidden rounded-lg p-4 border" style="background-color:var(--bg-modal-content);border-color:var(--border-color);">
        <p class="text-xs uppercase font-semibold mb-1" style="color:var(--text-muted);">ISF Status</p>
        <p class="text-sm font-bold" style="color:var(--text-primary);" id="isfSentStatus">Sent</p>
        <p class="text-xs mt-1" style="color:var(--text-muted);" id="isfSentZone">-</p>
        <p class="text-xs uppercase font-semibold mt-3 mb-1" style="color:var(--text-muted);" id="isfSentRemarkLabel">Category</p>
        <p class="text-sm leading-relaxed whitespace-pre-wrap break-words" style="color:var(--text-secondary);" id="isfSentRemark">-</p>
        <p class="text-xs mt-2" style="color:var(--text-muted);" id="isfSentMeta"></p>
      </div>

      <div id="isfFormStep" class="space-y-4">
        <div id="isfSetupBox" class="hidden rounded-lg p-3 text-xs border space-y-2" style="background-color:var(--bg-modal-content);border-color:var(--cb-yellow);color:var(--text-secondary);">
          <p class="font-semibold" style="color:var(--text-primary);">One-time setup (needed only once on this browser)</p>
          <p>1. Open the ISF Google Form in a new tab and press <b>F12</b> \u2192 <b>Console</b>.<br>
             2. Paste this line and press Enter:<br>
             <code style="user-select:all;word-break:break-all;">copy(JSON.stringify(FB_PUBLIC_LOAD_DATA_[1][1].map(q=>[q[1],q[4]?.[0]?.[0]])))</code><br>
             3. Come back here, paste (Ctrl+V) into the box below and click Save.</p>
          <textarea id="isfSetupText" rows="3" class="rounded-lg px-3 py-2 text-xs w-full" style="background-color:var(--bg-modal);color:var(--text-primary);border:1px solid var(--border-input);" placeholder="Paste here"></textarea>
          <button type="button" onclick="isfSaveSetup()" class="w-full py-2 rounded-lg bg-gold text-xs font-bold" style="color:var(--cb-black);">Save IDs</button>
        </div>
        <div id="isfAutoInfo" class="rounded-lg p-3 text-xs border" style="background-color:var(--bg-modal-content);border-color:var(--border-color);color:var(--text-secondary);"></div>
        <div>
          <label for="isf-zone" ${lbl}>Zone *</label>
          <select id="isf-zone" class="rounded-lg px-4 py-2 text-sm" style="${field}">${opts(ISF_ZONES, 'Choose zone')}</select>
        </div>
        <div>
          <label for="isf-hub" ${lbl}>Concern Hub * (from dashboard)</label>
          <input type="text" id="isf-hub" list="isfHubList" class="rounded-lg px-4 py-2 text-sm" style="${field}" placeholder="Type or pick the hub" maxlength="100" autocomplete="off">
          <datalist id="isfHubList">${ISF_HUBS.map(h => `<option value="${escapeHTML(h)}"></option>`).join('')}</datalist>
          <p id="isfHubStatus" class="text-xs mt-1" style="color:var(--text-muted);"></p>
        </div>
        <div>
          <label for="isf-category" ${lbl}>Issue Category *</label>
          <select id="isf-category" class="rounded-lg px-4 py-2 text-sm" style="${field}">${opts(ISF_CATEGORIES, 'Choose category')}</select>
        </div>
        <div>
          <label for="isf-subcategory" ${lbl}>Issue Sub Category *</label>
          <select id="isf-subcategory" class="rounded-lg px-4 py-2 text-sm" style="${field}">${opts(ISF_SUBCATEGORIES, 'Choose sub category')}</select>
        </div>
        <div>
          <label for="isf-details" ${lbl}>Issue Details * (from dashboard)</label>
          <textarea id="isf-details" rows="4" class="rounded-lg px-4 py-2 text-sm resize-none" style="${field}" maxlength="1000"></textarea>
        </div>
        <button type="button" id="isfOpenBtn" onclick="isfOpenForm()" class="w-full py-2.5 rounded-lg bg-gold hover:opacity-90 text-sm font-bold transition-colors" style="color:var(--cb-black);">Open ISF Form</button>
        <p class="text-xs text-center italic" style="color:var(--text-muted);"><i class="fa-solid fa-circle-info mr-1"></i>Channel = KAM and Status = Pending are filled automatically.</p>
      </div>

      <div id="isfConfirmStep" class="hidden space-y-4">
        <div class="rounded-lg p-4 border text-sm" style="background-color:var(--bg-modal-content);border-color:var(--border-color);color:var(--text-secondary);">
          <p class="font-semibold mb-2" style="color:var(--text-primary);">The ISF form opened in a new tab.</p>
          <p>1. Tick <b>Record email</b> on the form.<br>2. Press <b>Submit</b>.<br>3. Come back here and click <b>Mark as Sent</b>.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="isfMarkSent()" class="flex-1 py-2.5 rounded-lg bg-gold hover:opacity-90 text-sm font-bold transition-colors" style="color:var(--cb-black);">Mark as Sent</button>
          <button type="button" onclick="isfBackToForm()" class="px-4 py-2.5 rounded-lg text-sm font-medium border" style="border-color:var(--border-input);color:var(--text-secondary);">Back</button>
        </div>
      </div>`;
    $('isf-hub').addEventListener('input', updateHubStatus);
  }

  function updateHubStatus() {
    const el = $('isfHubStatus'), v = $('isf-hub').value.trim();
    if (!el) return;
    if (!v) { el.textContent = ''; return; }
    const hit = matchFormHub(v);
    if (hit) { el.textContent = '\u2713 ' + hit; el.style.color = '#22c55e'; }
    else { el.textContent = 'Not in the form\u2019s hub list \u2014 pick one from the list.'; el.style.color = '#ef4444'; }
  }

  function showStep(step) { // 'form' | 'confirm' | 'sent'
    $('isfFormStep').classList.toggle('hidden', step !== 'form');
    $('isfConfirmStep').classList.toggle('hidden', step !== 'confirm');
    $('isfSentInfo').classList.toggle('hidden', step !== 'sent');
  }

  function fillSentInfo(issue) {
    const rec = issue.isf;
    if (!rec) return;
    $('isfSentStatus').textContent = rec.status || 'Sent';
    $('isfSentZone').textContent = `${rec.hub || '-'} \u00b7 ${rec.zone || '-'}`;
    if (isFormRec(rec)) {
      $('isfSentRemarkLabel').textContent = 'Category';
      $('isfSentRemark').textContent = `${rec.category || '-'} \u203a ${rec.subcategory || '-'}`;
      $('isfSentMeta').textContent = [rec.updatedBy ? 'Sent by ' + rec.updatedBy : '', rec.updatedAt ? formatTimestamp(rec.updatedAt) : ''].filter(Boolean).join(' \u00b7 ');
    } else {
      $('isfSentRemarkLabel').textContent = 'OPS Remark';
      $('isfSentRemark').textContent = rec.remarks || 'No remark yet from OPS.';
      $('isfSentMeta').textContent = rec.remarks ? [rec.remarksBy ? 'By ' + rec.remarksBy : '', rec.remarksAt ? formatTimestamp(rec.remarksAt) : ''].filter(Boolean).join(' \u00b7 ') : '';
    }
  }

  // ===== overrides of the old Central-API implementation =====
  window.openIsfModal = function (ticketId) {
    if (!canUseIsf()) return;
    const issue = issuesData.find(i => i.ticketId === ticketId);
    if (!issue) return;
    if (!$('isfFormStep')) buildBody();
    cur = issue; picks = null;
    $('isfModalTicket').textContent = issue.ticketId;

    if (issue.isf && issue.isf.isfId) {
      fillSentInfo(issue);
      showStep('sent');
      if (isLegacyRec(issue.isf) && typeof refreshOneIsf === 'function') {
        Promise.resolve(refreshOneIsf(ticketId)).then(() => { if (cur === issue) fillSentInfo(issue); }).catch(() => {});
      }
    } else {
      const consignment = (issue.consignmentId || '').trim() || (issue.merchant || '').trim();
      const rawHub = (issue.hubManualName || issue.hub || '').trim();
      $('isfAutoInfo').innerHTML =
        `<b>Consignment:</b> ${escapeHTML(consignment || '-')} &nbsp;\u00b7&nbsp; <b>Channel:</b> KAM &nbsp;\u00b7&nbsp; <b>Status:</b> Pending`;
      $('isf-zone').value = '';
      $('isf-category').value = '';
      $('isf-subcategory').value = '';
      $('isf-hub').value = matchFormHub(rawHub) || rawHub;
      $('isf-details').value = issue.details || '';
      updateHubStatus();
      $('isfSetupBox').classList.toggle('hidden', entriesConfigured());
      showStep('form');
    }
    $('isfModal').classList.remove('hidden');
  };

  window.closeIsfModal = function () {
    $('isfModal').classList.add('hidden');
    cur = null; picks = null;
  };

  window.isfSaveSetup = function () {
    let rows;
    try { rows = JSON.parse($('isfSetupText').value.trim()); } catch (e) { rows = null; }
    if (!Array.isArray(rows)) { toast('That does not look right \u2014 repeat step 2 and paste again.', 'error'); return; }
    const idOf = re => {
      const r = rows.find(x => re.test(String(x[0] || '')));
      const n = r ? String(r[1] || '').replace(/^entry\./, '') : '';
      return /^\d+$/.test(n) ? 'entry.' + n : null;
    };
    const found = {
      consignment: idOf(/consignment/i),
      channel: idOf(/^\s*channel/i),
      zone: idOf(/^\s*zone/i),
      hub: idOf(/hub/i),
      status: idOf(/status/i),
      subCategory: idOf(/sub\s*category/i),
      details: idOf(/detail/i)
    };
    const cat = rows.find(x => /category/i.test(String(x[0] || '')) && !/sub/i.test(String(x[0] || '')));
    found.category = cat && /^\d+$/.test(String(cat[1] || '')) ? 'entry.' + cat[1] : null;
    const missing = Object.keys(found).filter(k => !found[k]);
    if (missing.length) { toast('Missing: ' + missing.join(', ') + '. Make sure you copied from the ISF form.', 'error'); return; }
    localStorage.setItem('isf-entry-ids', JSON.stringify(found));
    Object.assign(ISF_ENTRY, found);
    $('isfSetupBox').classList.add('hidden');
    toast('Setup saved. You can now open the ISF form.', 'success');
  };

  window.isfBackToForm = function () { showStep('form'); };

  window.isfOpenForm = function () {
    if (!cur) return;
    if (isViewer()) { toast('View-only access \u2014 you cannot send to ISF.', 'warning'); return; }
    const consignment = (cur.consignmentId || '').trim() || (cur.merchant || '').trim();
    const zone = $('isf-zone').value;
    const hub = matchFormHub($('isf-hub').value);
    const category = $('isf-category').value;
    const subCategory = $('isf-subcategory').value;
    const details = $('isf-details').value.trim();

    if (!consignment) { toast('This ticket has no consignment ID or merchant name.', 'warning'); return; }
    if (!zone || !category || !subCategory) { toast('Select Zone, Issue Category and Issue Sub Category.', 'warning'); return; }
    if (!hub) { toast('Pick a hub from the list \u2014 the form only accepts its own hub names.', 'warning'); return; }
    if (!details) { toast('Issue details are required.', 'warning'); return; }

    picks = { zone, hub, category, subcategory: subCategory };

    if (!entriesConfigured()) {
      $('isfSetupBox').classList.remove('hidden');
      toast('Do the one-time setup at the top of this popup first.', 'warning');
      return;
    }

    const p = new URLSearchParams({ usp: 'pp_url' });
    p.set(ISF_ENTRY.consignment, consignment);
    p.set(ISF_ENTRY.channel, 'KAM');
    p.set(ISF_ENTRY.zone, zone);
    p.set(ISF_ENTRY.hub, hub);
    p.set(ISF_ENTRY.status, 'Pending');
    p.set(ISF_ENTRY.category, category);
    p.set(ISF_ENTRY.subCategory, subCategory);
    p.set(ISF_ENTRY.details, details);
    window.open(`${ISF_FORM_URL}?${p.toString()}`, '_blank', 'noopener');
    showStep('confirm');
  };

  window.isfMarkSent = async function () {
    if (!cur || !picks) return;
    const issue = cur;
    const rec = {
      isfId: 'FORM-' + Date.now(),
      category: picks.category, subcategory: picks.subcategory, hub: picks.hub, zone: picks.zone,
      status: 'Sent', remarks: '', remarksBy: '', remarksAt: '',
      updatedBy: currentUser ? currentUser.name : 'Unknown',
      updatedAt: new Date().toISOString()
    };
    try {
      await saveIsfRecord(issue.ticketId, rec);
      issue.isf = rec;
      toast('Marked as sent to ISF', 'success');
      closeIsfModal();
      renderTable();
      if (!$('view-pending').classList.contains('hidden')) renderPendingTable();
    } catch (e) {
      console.error('Mark sent to ISF error:', e);
      toast('Could not save the sent status to the database.', 'error');
    }
  };

  window.renderIsfCell = function (issue) {
    if (!canUseIsf()) return '';
    const rec = issue.isf;
    const tid = escapeHTML(issue.ticketId);
    if (!rec || !rec.isfId) {
      return `<button type="button" onclick="openIsfModal('${tid}')" class="isf-send-btn">Send to ISF</button>`;
    }
    const legacyClass = { 'Open': 'isf-status-open', 'In Progress': 'isf-status-progress', 'Resolved': 'isf-status-resolved' };
    const badge = isFormRec(rec) ? 'isf-status-progress' : (legacyClass[rec.status] || 'isf-status-open');
    const preview = isFormRec(rec) ? `${rec.zone || ''} \u00b7 ${rec.category || ''}` : (rec.remarks || 'No remark yet');
    return `
        <div class="isf-sent-info" onclick="openIsfModal('${tid}')" title="Click to view details">
            <span class="isf-status-badge ${badge}">${escapeHTML(rec.status || 'Sent')}</span>
            <span class="isf-remark-preview" title="${escapeHTML(preview)}">${escapeHTML(preview)}</span>
        </div>`;
  };

  // Only tickets sent through the old Central API still need status/remark syncing.
  window.syncIsfStatuses = async function () {
    const pending = [...isfMap.entries()].filter(([, rec]) => isLegacyRec(rec) && rec.status !== 'Resolved');
    if (!pending.length) return;
    await Promise.all(pending.map(async ([ticketId, rec]) => {
      try {
        const res = await fetch(`${ISF_API_BASE}/api/issues/${rec.isfId}`, { headers: { 'x-service-key': ISF_SERVICE_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === rec.status && (data.remarks || '') === rec.remarks) return;
        await saveIsfRecord(ticketId, {
          ...rec, status: data.status || rec.status, remarks: data.remarks || '',
          remarksBy: data.remarks_by || '', remarksAt: data.updated_at || rec.remarksAt || '',
          updatedAt: new Date().toISOString()
        });
      } catch (err) { console.error(`ISF status sync failed for ${ticketId}:`, err); }
    }));
    applyIsf();
    renderTable();
    if (!$('view-pending').classList.contains('hidden')) renderPendingTable();
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('isfModal') && !$('isfModal').classList.contains('hidden')) closeIsfModal();
  });

  buildBody();
})();
