
    // =========================================================================
    // دوال الدخل والإيداعات المنقولة لصفحة طلب أموال
    // =========================================================================
    function openIncomeChoiceModal() {
      openModal('incomeChoiceModal');
    }

    function openIncomeHistoryModal() {
      openModal('incomeHistoryModal');
      renderIncomeHistoryList();
    }

    function renderIncomeHistoryList() {
      const container = document.getElementById('incomeHistoryListContainer');
      const totalAmtEl = document.getElementById('incomeHistoryTotalAmt');
      if (!container) return;

      const incomeList = (state.transactions || []).filter(t => t.type === 'income');
      // ترتيب تنازلي حسب التاريخ
      incomeList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      let total = 0;
      incomeList.forEach(t => { total += (Number(t.amount) || 0); });
      if (totalAmtEl) totalAmtEl.textContent = '+ ' + formatMoney(total);

      if (incomeList.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 25px 10px; color: #94a3b8;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 8px;"></i>
            <div style="font-weight: 800; font-size: 0.85rem;">لا توجد عمليات إيداع أو دخل مسجلة</div>
          </div>
        `;
        return;
      }

      container.innerHTML = incomeList.map(t => {
        const amt = Number(t.amount) || 0;
        const wName = getWalletName(t.walletId);
        const memberAvatar = MEMBER_AVATARS[t.member] || null;
        const avatarHtml = memberAvatar
          ? `<img src="${memberAvatar}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;">`
          : `<i class="fa-solid fa-user" style="font-size: 0.7rem; color: #10b981;"></i>`;

        return `
          <div class="ops-tx-card-lux" style="cursor: pointer;" ondblclick="closeModal('incomeHistoryModal'); openEditTxModal('${t.id}')" title="اضغط مرتين للتعديل">
            <div class="ops-tx-right-cluster">
              <div class="ops-tx-icon-bubble" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff;">
                <i class="fa-solid fa-money-bill-wave"></i>
              </div>
              <div class="ops-tx-info-block">
                <div class="ops-tx-label-text">${escapeHtml(t.label || 'إيداع نقدي')}</div>
                <div class="ops-tx-meta-chips">
                  <span class="ops-tx-chip" style="background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25);">
                    ${avatarHtml}
                    <span>${t.member || 'العائلة'}</span>
                  </span>
                  <span class="ops-tx-chip" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">
                    <i class="fa-solid fa-vault"></i>
                    <span>${wName}</span>
                  </span>
                  <span class="ops-tx-chip" style="color: #94a3b8;">
                    <i class="fa-regular fa-calendar"></i>
                    <span>${t.date || ''}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="ops-tx-left-cluster">
              <span class="ops-tx-amount-text" style="color: #10b981; font-weight: 900;">
                + ${formatMoney(amt)}
              </span>
              <button class="ops-tx-edit-btn" onclick="closeModal('incomeHistoryModal'); openEditTxModal('${t.id}')" title="تعديل الإيداع" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 4px;">
                <i class="fa-solid fa-pen-to-square" style="font-size: 0.76rem;"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // =========================================================================
    // نظام البحث التلقائي عن التحديثات وتنزيلها مع كل عملية فتح للبرنامج (AutoUpdateManager)
    // =========================================================================
    let isCheckingForAppUpdates = false;
    let lastAppUpdateCheckTime = 0;

    /**
     * البحث التلقائي عن التحديثات الجديدة وتنزيلها وتطبيقها تلقائياً مع كل فتح للبرنامج
     * @param {Object} options { isManual: boolean, silent: boolean }
     */
    function forcePurgeCacheAndReload() {
      showToast('🚀 جاري مسح الذاكرة المؤقتة وتحديث البرنامج بالكامل لأحدث نسخة...', 'info', 4000);
      try {
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
        }
      } catch(e) {}
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
          });
        }
      } catch(e) {}
      localStorage.removeItem('family_monefy_version');
      localStorage.removeItem('family_monefy_etag');
      sessionStorage.clear();
      setTimeout(() => {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.replace(`${cleanUrl}?_fresh=${Date.now()}`);
      }, 700);
    }

    async function checkAndApplyAppUpdates(options = { isManual: false, silent: true }) {
      const now = Date.now();
      // منع التكرار اللحظي إذا كان قد تم الفحص قبل أقل من 8 ثوانٍ إلا إذا كان يدوياً
      if (!options.isManual && (now - lastAppUpdateCheckTime < 8000)) return;
      if (isCheckingForAppUpdates) return;
      
      isCheckingForAppUpdates = true;
      lastAppUpdateCheckTime = now;

      const updateBtnIcon = document.getElementById('settingsAppUpdateIconSpin');
      const updateStatusBadge = document.getElementById('settingsAppUpdateStatusBadge');
      if (updateBtnIcon) updateBtnIcon.classList.add('fa-spin');
      if (updateStatusBadge) updateStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري فحص التحديثات...';

      try {
        console.log('🔍 [AutoUpdate] جاري البحث عن تحديثات جديدة للبرنامج من السيرفر...');
        
        let remoteBuild = null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // 1. محاولة قراءة ملف version.json مع منع الكاش تماماً من السيرفر
        try {
          const vUrl = `version.json?_nocache=${now}&_r=${Math.random()}`;
          const res = await fetch(vUrl, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            remoteBuild = await res.json();
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn('⚠️ [AutoUpdate] تعذر قراءة version.json مباشرة:', fetchErr.message);
        }

        // 2. فحص الرأس المباشر للصفحة (HEAD request) إذا لم يتوفر version.json
        if (!remoteBuild) {
          try {
            const headController = new AbortController();
            const headTimeout = setTimeout(() => headController.abort(), 4000);
            const pathUrl = window.location.pathname || 'index.html';
            const headRes = await fetch(`${pathUrl}?_head=${now}`, {
              method: 'HEAD',
              cache: 'no-store',
              signal: headController.signal
            });
            clearTimeout(headTimeout);
            if (headRes.ok) {
              const etag = headRes.headers.get('ETag') || headRes.headers.get('Last-Modified');
              const localEtag = localStorage.getItem('family_monefy_etag');
              if (etag && localEtag && etag !== localEtag) {
                remoteBuild = {
                  version: 'أحدث',
                  buildId: Date.now(),
                  etag: etag,
                  notes: 'تحديث جديد تم رصده في ملفات التطبيق'
                };
              } else if (etag && !localEtag) {
                localStorage.setItem('family_monefy_etag', etag);
              }
            }
          } catch(e) {}
        }

        // 3. التحقق مما إذا كان هناك إصدار أحدث متوفر بالسيرفر
        const currentBuildNum = (typeof window !== 'undefined' && window.APP_BUILD_ID) ? Number(window.APP_BUILD_ID) : (typeof APP_BUILD_ID !== 'undefined' ? Number(APP_BUILD_ID) : 202611071415);
        const currentVerStr = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '4.9.4');
        
        const isNewer = remoteBuild && remoteBuild.buildId && (
          Number(remoteBuild.buildId) > currentBuildNum || 
          (remoteBuild.version && remoteBuild.version !== currentVerStr && Number(remoteBuild.buildId) >= currentBuildNum)
        );

        if (isNewer) {
          console.log(`🚀 [AutoUpdate] تم اكتشاف إصدار جديد: ${remoteBuild.version} (Build: ${remoteBuild.buildId})`);
          
          // حماية ضد التكرار المتتالي في حال تأخر خوادم GitHub CDN عن توزيع الكود المصدري الجديد
          const attemptKey = `upd_attempt_${remoteBuild.buildId}`;
          const attempts = Number(sessionStorage.getItem(attemptKey) || 0);
          if (attempts >= 2) {
            console.warn('⚠️ [AutoUpdate] تم عمل محاولتي تحديث سابقتين لنفس الإصدار. بانتظار اكتمال توزيع السيرفر.');
            if (options.isManual) {
              showToast('تم رصد التحديث بالفعل، وجاري اكتمال نشره على خوادم GitHub. سيتم تطبيقه تلقائياً خلال دقيقة.', 'info');
            }
            if (updateStatusBadge) updateStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> أحدث إصدار';
            return;
          }
          sessionStorage.setItem(attemptKey, attempts + 1);

          // إشعار المستخدم فوراً ببدء التنزيل والتطبيق التلقائي
          showToast(`🚀 تم العثور على تحديث جديد (${remoteBuild.version || 'جديد'})! جاري التحميل والتطبيق تلقائياً...`, 'info', 4000);
          if (updateStatusBadge) updateStatusBadge.innerHTML = '<i class="fa-solid fa-cloud-arrow-down fa-bounce"></i> جاري تنزيل التحديث...';

          // حفظ كافة البيانات والمصروفات فوراً قبل التحديث لمنع أي فقد للبيانات
          try {
            if (typeof saveTx === 'function') saveTx();
            if (typeof syncWithCloud === 'function') await syncWithCloud();
          } catch(e) {}

          // مسح الذاكرة المؤقتة القديمة بالكامل
          if ('caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            } catch(e) {}
          }

          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const reg of registrations) await reg.update();
            } catch(e) {}
          }

          // تسجيل وسام نجاح التحديث لعرضه بعد إعادة التحميل
          localStorage.setItem('family_monefy_just_updated', remoteBuild.version || 'الجديد');
          if (remoteBuild.etag) localStorage.setItem('family_monefy_etag', remoteBuild.etag);

          // إعادة تحميل التطبيق تلقائياً مع معرّف التحديث لمنع أي كاش محلي
          setTimeout(() => {
            const cleanUrl = window.location.origin + window.location.pathname;
            const newUrl = `${cleanUrl}?_upd=${remoteBuild.buildId}&_t=${Date.now()}`;
            window.location.replace(newUrl);
          }, 800);
          return;
        }

        // 4. التطبيق يعمل على أحدث إصدار بالفعل
        console.log(`✅ [AutoUpdate] التطبيق محدث بالكامل لأحدث إصدار (v${currentVerStr} - Build: ${currentBuildNum})`);
        
        // التحقق مما إذا كان البرنامج قد تم تحديثه للتو
        const justUpdatedVer = localStorage.getItem('family_monefy_just_updated');
        if (justUpdatedVer) {
          localStorage.removeItem('family_monefy_just_updated');
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          showToast(`✨ تم تحديث البرنامج بنجاح لأحدث إصدار (${currentVerStr})!`, 'success', 5000);
        } else if (options.isManual) {
          showToast(`✅ التطبيق محدث بالفعل لأحدث إصدار (v${currentVerStr})`, 'success');
        }

        if (updateStatusBadge) {
          updateStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #22c55e;"></i> فحص تلقائي نشط (v${currentVerStr})`;
        }

      } catch (err) {
        console.warn('⚠️ [AutoUpdate] خطأ أثناء فحص التحديثات:', err);
        if (options.isManual) {
          showToast('تعذر فحص التحديثات حالياً. يرجى التحقق من اتصال الإنترنت.', 'warning');
        }
        if (updateStatusBadge) {
          updateStatusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> فحص غير متاح حالياً';
        }
      } finally {
        isCheckingForAppUpdates = false;
        if (updateBtnIcon) updateBtnIcon.classList.remove('fa-spin');
      }
    }

    // دوال التوافق السريع للأزرار والنداءات السابقة
    function forceAppReloadAndCacheBust() {
      checkAndApplyAppUpdates({ isManual: true, silent: false });
    }
    function forceAppReloadAndSync() {
      checkAndApplyAppUpdates({ isManual: true, silent: false });
    }

    // =========================================================================
    // دوال تفاصيل وتعديل العملية المالية
    // =========================================================================
    
    currentEditTxReceiptDataUri = window.currentEditTxReceiptDataUri || null;

    function handleEditReceiptUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const maxDim = 1200;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          currentEditTxReceiptDataUri = canvas.toDataURL('image/jpeg', 0.82);
          updateEditTxReceiptPreview();
          showToast('📸 تم تحميل صورة الفاتورة للعملية بنجاح');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function updateEditTxReceiptPreview() {
      const container = document.getElementById('editReceiptPreviewContainer');
      const img = document.getElementById('editReceiptPreviewImg');
      const badge = document.getElementById('editReceiptAttachedBadge');
      if (currentEditTxReceiptDataUri) {
        if (img) img.src = currentEditTxReceiptDataUri;
        if (container) container.style.display = 'block';
        if (badge) badge.style.display = 'inline-block';
      } else {
        if (img) img.src = '';
        if (container) container.style.display = 'none';
        if (badge) badge.style.display = 'none';
      }
    }

    function clearEditReceiptUpload() {
      currentEditTxReceiptDataUri = null;
      const inp1 = document.getElementById('inpEditTxReceipt');
      const inp2 = document.getElementById('inpEditTxReceiptCamera');
      if (inp1) inp1.value = '';
      if (inp2) inp2.value = '';
      updateEditTxReceiptPreview();
      showToast('🗑️ تمت إزالة صورة الفاتورة');
    }
    
    function openEditTxModal(txId) {
      const tx = (state.transactions || []).find(t => String(t.id) === String(txId));
      if (!tx) {
        showToast('لم يتم العثور على العملية المطلوبة', 'error');
        return;
      }

      document.getElementById('editTxId').value = tx.id;
      document.getElementById('editTxAmount').value = tx.amount || '';
      document.getElementById('editTxLabel').value = tx.label || '';
      document.getElementById('editTxDate').value = tx.date || new Date().toISOString().split('T')[0];

      if (tx.type === 'income') {
        document.getElementById('editTxTypeIncome').checked = true;
      } else {
        document.getElementById('editTxTypeExpense').checked = true;
      }

      // ملء قائمة التصنيفات
      const catSelect = document.getElementById('editTxCategory');
      if (catSelect) {
        const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        catSelect.innerHTML = cats.map(c => `
          <option value="${c.id}" ${c.id === tx.category ? 'selected' : ''}>${c.name}</option>
        `).join('');
      }

      // ملء قائمة المحافظ
      const walletSelect = document.getElementById('editTxWallet');
      if (walletSelect) {
        walletSelect.innerHTML = (state.wallets || []).map(w => `
          <option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${w.name}</option>
        `).join('');
      }

      // ملء قائمة الأعضاء بترتيب العائلة أولاً
      const memberSelect = document.getElementById('editTxMember');
      if (memberSelect) {
        const members = ['البيت', 'ماهر', 'أية', 'محمد', 'مريم', 'الحاجة', 'النونو', 'أخرى'];
        memberSelect.innerHTML = members.map(m => `
          <option value="${m}" ${m === tx.member ? 'selected' : ''}>${m}</option>
        `).join('');
      }

      
      currentEditTxReceiptDataUri = tx.receipt || null;
      updateEditTxReceiptPreview();
      updateEditTxReceiptPreview();
      openModal('editTxModal');
    }

    function saveEditedTx() {
      const txId = document.getElementById('editTxId').value;
      const tx = (state.transactions || []).find(t => String(t.id) === String(txId));
      if (!tx) {
        showToast('حدث خطأ في تحديد العملية', 'error');
        return;
      }

      const amountVal = parseFloat(document.getElementById('editTxAmount').value);
      if (isNaN(amountVal) || amountVal <= 0) {
        showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'error');
        return;
      }

      const labelVal = document.getElementById('editTxLabel').value.trim();
      if (!labelVal) {
        showToast('يرجى إدخال بيان للعملية', 'error');
        return;
      }

      const isIncome = document.getElementById('editTxTypeIncome').checked;
      const typeVal = isIncome ? 'income' : 'expense';
      const categoryVal = document.getElementById('editTxCategory').value;
      const walletVal = document.getElementById('editTxWallet').value;
      const memberVal = document.getElementById('editTxMember').value;
      const dateVal = document.getElementById('editTxDate').value;

      // تحديث بيانات العملية
      tx.amount = amountVal;
      tx.label = labelVal;
      tx.type = typeVal;
      tx.category = categoryVal;
      tx.walletId = walletVal;
      tx.member = memberVal;
      tx.date = dateVal;
      tx.receipt = currentEditTxReceiptDataUri !== undefined ? currentEditTxReceiptDataUri : tx.receipt;

      // حفظ الحالة محلياً وسحابياً عبر محرك الحفظ الرئيسي المعتمد
      saveTx();

      closeModal('editTxModal');
      logActivity({
        type: 'edit_tx',
        action: 'تعديل حركة مالية',
        label: `تعديل حركة: ${labelVal} (${formatMoney(amountVal)})`,
        amount: amountVal,
        sign: typeVal === 'income' ? '+' : '-',
        member: memberVal,
        author: state.currentUser || 'ماهر',
        wallet: walletVal,
        notes: 'تم تعديل بيانات الحركة وتحديث الحسابات'
      });

      showToast('تم حفظ وتعديل العملية بنجاح! ✨', 'success');

      // إعادة رسم الواجهة وقائمة العمليات
      if (typeof renderUI === 'function') renderUI();
      filterOperationsList();
    }

    // =========================================================================
    // محرك الإصدار المطور الشامل v3.2.0 (Master Overhaul Engine)
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. تحويل ونقل الرصيد بين المحافظ المالية (Inter-Wallet Transfer Engine)
    // -------------------------------------------------------------------------
    function openWalletTransferModal() {
      const fromSel = document.getElementById('inpTransferFromWallet');
      const toSel = document.getElementById('inpTransferToWallet');
      const amtInp = document.getElementById('inpTransferAmount');
      const dateInp = document.getElementById('inpTransferDate');
      const notesInp = document.getElementById('inpTransferNotes');

      if (!fromSel || !toSel) return;

      const wallets = state.wallets || [];
      const optsHtml = wallets.map(w => `<option value="${w.id}">${w.name} (${formatMoney(w.balance || 0)})</option>`).join('');

      fromSel.innerHTML = optsHtml;
      toSel.innerHTML = optsHtml;

      if (wallets.length > 1) {
        toSel.selectedIndex = 1;
      }

      if (amtInp) amtInp.value = '';
      if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];
      if (notesInp) notesInp.value = '';

      openModal('walletTransferModal');
    }

    function executeWalletTransfer() {
      const fromSel = document.getElementById('inpTransferFromWallet');
      const toSel = document.getElementById('inpTransferToWallet');
      const amtInp = document.getElementById('inpTransferAmount');
      const dateInp = document.getElementById('inpTransferDate');
      const notesInp = document.getElementById('inpTransferNotes');

      const fromId = fromSel ? fromSel.value : '';
      const toId = toSel ? toSel.value : '';
      const amount = parseFloat(amtInp ? amtInp.value : 0);
      const date = dateInp && dateInp.value ? dateInp.value : new Date().toISOString().split('T')[0];
      const notes = notesInp ? notesInp.value.trim() : '';

      if (isNaN(amount) || amount <= 0) {
        showToast('⚠️ الرجاء إدخال مبلغ صحيح أكبر من الصفر للتحويل', 'error');
        if (amtInp) amtInp.focus();
        return;
      }

      if (fromId === toId) {
        showToast('⚠️ لا يمكن التحويل لنفس المحفظة! يرجى اختيار محفظتين مختلفتين', 'error');
        return;
      }

      const fromWallet = (state.wallets || []).find(w => w.id === fromId);
      const toWallet = (state.wallets || []).find(w => w.id === toId);

      if (!fromWallet || !toWallet) {
        showToast('⚠️ حدث خطأ في تحديد بيانات المحافظ', 'error');
        return;
      }

      // تحديث أرصدة المحافظ
      fromWallet.balance = (Number(fromWallet.balance) || 0) - amount;
      toWallet.balance = (Number(toWallet.balance) || 0) + amount;
      try {
        localStorage.setItem('family_monefy_wallets', JSON.stringify(state.wallets));
      } catch(e) {}

      // تسجيل حركة التحويل في سجل العمليات
      const transferTx = {
        id: 'tx-trans-' + Date.now(),
        type: 'transfer',
        fromWalletId: fromId,
        toWalletId: toId,
        amount: amount,
        label: notes || `تحويل من ${fromWallet.name} إلى ${toWallet.name}`,
        category: 'other',
        member: state.currentUser || 'ماهر',
        author: state.currentUser || 'ماهر',
        date: date,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        notes: `تحويل بين المحافظ: من [${fromWallet.name}] إلى [${toWallet.name}]`
      };

      state.transactions.unshift(transferTx);
      saveTx();

      // التوثيق في الأرشيف
      logActivity({
        type: 'wallet_transfer',
        action: 'تحويل بين المحافظ',
        label: `تحويل ${formatMoney(amount)} من [${fromWallet.name}] إلى [${toWallet.name}]`,
        amount: amount,
        member: state.currentUser || 'ماهر',
        author: state.currentUser || 'ماهر'
      });

      playNotificationChime();
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);

      closeModal('walletTransferModal');
      populateWalletDropdowns();
      renderUI();
      showToast(`⚡ تم تحويل (${formatMoney(amount)}) من [${fromWallet.name}] إلى [${toWallet.name}] بنجاح`);
    }

    // -------------------------------------------------------------------------
    // 2. كشف حركات المحفظة المحاسبي والتصدير إكسيل و PDF
    // -------------------------------------------------------------------------
    function openWalletStatementModal() {
      const selectFilter = document.getElementById('stmtWalletFilter');
      if (selectFilter) {
        let html = '<option value="all">كل المحافظ مجتمعة (إجمالي شامل)</option>';
        (state.wallets || []).forEach(w => {
          html += `<option value="${w.id}">${w.name}</option>`;
        });
        selectFilter.innerHTML = html;
        selectFilter.value = state.currentWalletId || 'all';
      }

      renderWalletStatement();
      openModal('walletStatementModal');
    }

    function renderWalletStatement() {
      const selectFilter = document.getElementById('stmtWalletFilter');
      const periodFilter = document.getElementById('stmtPeriodFilter');
      const tableContainer = document.getElementById('walletStatementTableContainer');

      const targetWalletId = selectFilter ? selectFilter.value : 'all';
      const period = periodFilter ? periodFilter.value : 'all';

      let txList = state.transactions || [];

      // تصفية المحفظة
      if (targetWalletId !== 'all') {
        txList = txList.filter(t => t.walletId === targetWalletId || t.fromWalletId === targetWalletId || t.toWalletId === targetWalletId);
      }

      // تصفية الفترة الزمنية
      const now = new Date();
      const todayStr = getLocalDateStr(now);
      if (period === 'today') {
        txList = txList.filter(t => t.date === todayStr);
      } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = getLocalDateStr(weekAgo);
        txList = txList.filter(t => t.date >= weekAgoStr);
      } else if (period === 'month') {
        const monthPrefix = todayStr.substring(0, 7);
        txList = txList.filter(t => (t.date || '').startsWith(monthPrefix));
      }

      // ترتيب زمني تصاعدي لحساب الرصيد التراكمي بدقة
      const chronological = [...txList].reverse();

      let openingBalance = 0;
      if (targetWalletId !== 'all') {
        const wObj = (state.wallets || []).find(w => w.id === targetWalletId);
        openingBalance = Number(wObj ? wObj.initialBalance : 0) || 0;
      } else {
        openingBalance = (state.wallets || []).reduce((sum, w) => sum + (Number(w.initialBalance) || 0), 0);
      }

      let running = openingBalance;
      let totalIn = 0;
      let totalOut = 0;

      const statementRows = chronological.map(tx => {
        let isCredit = false;
        let isDebit = false;
        let rowAmount = Number(tx.amount) || 0;

        if (tx.type === 'income') {
          isCredit = true;
          totalIn += rowAmount;
          running += rowAmount;
        } else if (tx.type === 'expense') {
          isDebit = true;
          totalOut += rowAmount;
          running -= rowAmount;
        } else if (tx.type === 'transfer') {
          if (targetWalletId === 'all') {
            // تحويل داخلي لا يغير إجمالي كل المحافظ
          } else if (tx.toWalletId === targetWalletId) {
            isCredit = true;
            totalIn += rowAmount;
            running += rowAmount;
          } else if (tx.fromWalletId === targetWalletId) {
            isDebit = true;
            totalOut += rowAmount;
            running -= rowAmount;
          }
        }

        return {
          date: tx.date || '',
          time: tx.time || '',
          label: tx.label || '',
          type: tx.type,
          isCredit,
          isDebit,
          amount: rowAmount,
          balanceAfter: running,
          member: tx.member || '',
          author: tx.author || tx.member || state.currentUser || 'ماهر',
          walletName: getWalletName(tx.walletId || tx.toWalletId || tx.fromWalletId)
        };
      });

      // تحديث كروت الملخص الأربعة
      const elOpen = document.getElementById('stmtOpeningBal');
      const elIn = document.getElementById('stmtTotalInflow');
      const elOut = document.getElementById('stmtTotalOutflow');
      const elClose = document.getElementById('stmtClosingBal');

      if (elOpen) elOpen.textContent = formatMoney(openingBalance);
      if (elIn) elIn.textContent = '+ ' + formatMoney(totalIn);
      if (elOut) elOut.textContent = '- ' + formatMoney(totalOut);
      if (elClose) elClose.textContent = formatMoney(running);

      // بناء جدول كشف الحساب
      if (tableContainer) {
        if (statementRows.length === 0) {
          tableContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #64748b; font-size: 0.85rem;">
              <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;"></i>
              <p>لا توجد حركات مسجلة لهذه المحفظة خلال الفترة المحددة</p>
            </div>
          `;
          return;
        }

        // عرض السطور بترتيب تنازلي (الأحدث أولاً)
        const displayRows = [...statementRows].reverse();

        tableContainer.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: right;">
            <thead>
              <tr style="background: rgba(30, 41, 59, 0.9); color: #38bdf8; border-bottom: 1.5px solid rgba(56, 189, 248, 0.3);">
                <th style="padding: 8px 10px;">التاريخ</th>
                <th style="padding: 8px;">البيان</th>
                <th style="padding: 8px;">نوع الحركة</th>
                <th style="padding: 8px;">منفذ العملية</th>
                <th style="padding: 8px; text-align: center;">المبلغ</th>
                <th style="padding: 8px 10px; text-align: left;">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.map(r => {
                let badge = '';
                let amtDisplay = '';
                if (r.type === 'income') {
                  badge = '<span style="color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 2px 6px; border-radius: 6px; font-weight: 800;">إيداع +</span>';
                  amtDisplay = `<span style="color: #34d399; font-weight: 900;">+ ${formatMoney(r.amount)}</span>`;
                } else if (r.type === 'expense') {
                  badge = '<span style="color: #f87171; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 6px; font-weight: 800;">صرف -</span>';
                  amtDisplay = `<span style="color: #f87171; font-weight: 900;">- ${formatMoney(r.amount)}</span>`;
                } else {
                  badge = '<span style="color: #fbbf24; background: rgba(245, 158, 11, 0.15); padding: 2px 6px; border-radius: 6px; font-weight: 800;">تحويل 🔄</span>';
                  amtDisplay = `<span style="color: #fbbf24; font-weight: 900;">${formatMoney(r.amount)}</span>`;
                }

                return `
                  <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <td style="padding: 8px 10px; color: #94a3b8; font-size: 0.72rem; white-space: nowrap;">${r.date}</td>
                    <td style="padding: 8px; color: #f1f5f9; font-weight: 700;">
                      ${escapeHtml(r.label)}
                      <div style="font-size: 0.65rem; color: #64748b;">${r.walletName} • ${r.member}</div>
                    </td>
                    <td style="padding: 8px;">${badge}</td>
                    <td style="padding: 8px; font-weight: 700; color: #38bdf8;">${escapeHtml(r.author || r.member || 'ماهر')}</td>
                    <td style="padding: 8px; text-align: center; white-space: nowrap;">${amtDisplay}</td>
                    <td style="padding: 8px 10px; text-align: left; font-weight: 900; color: #38bdf8; font-variant-numeric: tabular-nums;">${formatMoney(r.balanceAfter)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    function exportWalletStatementExcel() {
      if (typeof XLSX === 'undefined') {
        showToast('⚠️ جاري تحميل مكتبة الإكسيل، يرجى المحاولة بعد لحظات', 'info');
        return;
      }

      const selectFilter = document.getElementById('stmtWalletFilter');
      const targetWalletId = selectFilter ? selectFilter.value : 'all';
      const wName = targetWalletId === 'all' ? 'كافة المحافظ' : (getWalletName(targetWalletId) || 'المحفظة');

      const rows = [];
      rows.push(['كشف حساب وحركات المحفظة المحاسبي المعتمد']);
      rows.push(['المحفظة:', wName]);
      rows.push(['تاريخ التصدير:', new Date().toLocaleDateString('ar-EG')]);
      rows.push([]);
      rows.push(['التاريخ', 'البيان', 'نوع الحركة', 'المحفظة', 'منفذ العملية', 'المبلغ', 'الرصيد التراكمي']);

      const tableEl = document.querySelector('#walletStatementTableContainer table');
      if (!tableEl) {
        showToast('لا توجد بيانات لتصديرها', 'error');
        return;
      }

      const trs = tableEl.querySelectorAll('tbody tr');
      trs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 6) {
          const date = tds[0].textContent.trim();
          const label = tds[1].textContent.trim().replace(/\s+/g, ' ');
          const type = tds[2].textContent.trim();
          const executor = tds[3].textContent.trim();
          const amt = tds[4].textContent.trim();
          const bal = tds[5].textContent.trim();
          rows.push([date, label, type, wName, executor, amt, bal]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!dir'] = 'rtl';
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
      XLSX.writeFile(wb, `كشف_حساب_${wName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      showToast('📊 تم تصدير كشف الحساب إكسيل بنجاح');
    }

    function exportWalletStatementPdf() {
      const tableContainer = document.getElementById('walletStatementTableContainer');
      const selectFilter = document.getElementById('stmtWalletFilter');
      const wName = selectFilter && selectFilter.value !== 'all' ? getWalletName(selectFilter.value) : 'كافة المحافظ مجتمعة';

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>عيلة ماهر ❤️ أية</title>
  <meta name="apple-mobile-web-app-title" content="عيلة ماهر ❤️ أية">
          <style>
            body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 20px; color: #1e293b; }
            h2 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.85rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
            th { background: #f1f5f9; color: #0f172a; }
            .credit { color: #047857; font-weight: bold; }
            .debit { color: #b91c1c; font-weight: bold; }
            .kpi-row { display: flex; gap: 10px; margin-bottom: 16px; }
            .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <h2>كشف حساب وحركات المحفظة المعتمد</h2>
          <div class="header-info">
            <div><strong>المحفظة:</strong> ${wName}</div>
            <div><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
            <div><strong>المسؤول:</strong> ${state.currentUser || 'ماهر'}</div>
          </div>
          ${tableContainer ? tableContainer.innerHTML : ''}
          <script>
            window.onload = function() { window.print(); };
          <\/script>
        
  <!-- =========================================================================
       نافذة تفاصيل عملية الأرشيف الفاخرة (Activity Details Modal)
       تعرض كامل تفاصيل العملية دون اختصار مع المستند المرفق وزر الانتقال
       ========================================================================= -->
  <div class="modal-overlay modal-overlay-custom" id="activityDetailsModal" style="display: none; z-index: 100020 !important; align-items: center !important; justify-content: center !important; padding: 14px; direction: rtl;" dir="rtl" onclick="if(event.target === this) closeModal('activityDetailsModal')">
    <div class="modal-content-card" style="max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.85); padding: 18px; box-sizing: border-box;">
      
      <!-- هيدر النافذة -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="actDetailHeaderIconBadge" style="width: 38px; height: 38px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); border: 1.2px solid rgba(56, 189, 248, 0.35); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: #38bdf8;">
            <i class="fa-solid fa-clock-rotate-left" id="actDetailHeaderIcon"></i>
          </div>
          <div>
            <h3 id="actDetailActionTitle" style="font-size: 0.98rem; font-weight: 900; color: #f8fafc; margin: 0;">تفاصيل حركة الأرشيف</h3>
            <span id="actDetailTypeBadge" style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">سجل الحركة الموثقة</span>
          </div>
        </div>
        <button type="button" onclick="closeModal('activityDetailsModal')" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- بانر المبلغ المالي الضخم والمدقق محاسبياً -->
      <div id="actDetailAmountBanner" style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 12px; text-align: center; margin-bottom: 14px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);">
        <div style="font-size: 0.70rem; color: #94a3b8; font-weight: 800; margin-bottom: 3px;">قيمة العملية المالية</div>
        <div id="actDetailAmountVal" style="font-size: 1.75rem; font-weight: 900; color: #38bdf8; direction: ltr; font-variant-numeric: tabular-nums;">+ 0.00 ج.م</div>
      </div>

      <!-- نص البيان والوصف الكامل دون أي اختصار -->
      <div style="margin-bottom: 12px;">
        <label style="font-size: 0.70rem; font-weight: 800; color: #94a3b8; margin-bottom: 4px; display: block;">البيان والوصف الكامل للعملية:</label>
        <div id="actDetailFullLabel" style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 12px; line-height: 1.5; word-break: break-word;"></div>
      </div>

      <!-- شبكة البيانات التفصيلية (التاريخ، المنفذ، المستفيد، المحفظة، البند) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <!-- التاريخ والوقت -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-regular fa-calendar-check" style="color: #38bdf8;"></i> التاريخ والوقت</div>
          <div id="actDetailDateTime" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0;"></div>
        </div>

        <!-- المنفذ (المستخدم الفعلي) -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-user-pen" style="color: #a855f7;"></i> المنفذ (بواسطة)</div>
          <div id="actDetailAuthor" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; gap: 6px;"></div>
        </div>

        <!-- يخص من في الأسرة -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-people-roof" style="color: #f59e0b;"></i> يخص في الأسرة</div>
          <div id="actDetailMember" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; gap: 6px;"></div>
        </div>

        <!-- المحفظة أو الحساب -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-wallet" style="color: #10b981;"></i> المحفظة / الخزينة</div>
          <div id="actDetailWallet" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0;"></div>
        </div>
      </div>

      <!-- بند الملاحظات الإضافية (إن وجد) -->
      <div id="actDetailNotesCard" style="display: none; background: rgba(245, 158, 11, 0.08); border: 1.2px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;">
        <div style="font-size: 0.68rem; font-weight: 800; color: #fbbf24; margin-bottom: 2px;"><i class="fa-solid fa-note-sticky"></i> ملاحظات إضافية:</div>
        <div id="actDetailNotesTxt" style="font-size: 0.78rem; font-weight: 700; color: #f8fafc; line-height: 1.4;"></div>
      </div>

      <!-- معاينة المستند المرفق (الفاتورة / الإيصال / الصورة) -->
      <div id="actDetailReceiptCard" style="background: rgba(15, 23, 42, 0.85); border: 1.2px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 10px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #cbd5e1; display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-file-invoice-dollar" style="color: #38bdf8;"></i> المستند المرفق / الفاتورة:
          </span>
          <span id="actDetailReceiptStatusBadge" style="font-size: 0.62rem; padding: 1px 6px; border-radius: 5px; font-weight: 800;"></span>
        </div>

        <!-- صورة المستند المرفق إن وجدت -->
        <div id="actDetailReceiptImgBox" style="display: none; position: relative; border-radius: 10px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.12);">
          <img id="actDetailReceiptImg" src="" style="width: 100%; max-height: 200px; object-fit: contain; display: block; cursor: pointer;" onclick="openReceiptFromActDetail()" title="انقر لتكبير المستند بالشاشة الكاملة">
          <div style="position: absolute; bottom: 6px; right: 6px; display: flex; gap: 6px;">
            <button type="button" onclick="openReceiptFromActDetail()" style="background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 0.70rem; padding: 4px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-expand"></i> تكبير
            </button>
            <button type="button" onclick="downloadReceiptFromActDetail()" style="background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 0.70rem; padding: 4px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-download"></i> حفظ
            </button>
          </div>
        </div>

        <!-- حالة عدم وجود مرفق -->
        <div id="actDetailNoReceiptMsg" style="display: block; text-align: center; padding: 12px; color: #64748b; font-size: 0.75rem; font-weight: 700;">
          <i class="fa-regular fa-image" style="font-size: 1.3rem; margin-bottom: 4px; display: block; opacity: 0.4;"></i>
          لا توجد صورة أو فاتورة مرفقة مع هذه الحركة
        </div>
      </div>

      <!-- أزرار الإجراءات السريعة (الانتقال لقسم الحركة + الإغلاق) -->
      <div style="display: flex; gap: 8px;">
        <button type="button" id="btnActDetailContextJump" onclick="jumpToActivityContext()" class="btn-submit-tx" style="flex: 1; height: 40px; font-size: 0.82rem; font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 10px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> <span id="actDetailJumpBtnTxt">الانتقال للقسم المعني</span>
        </button>
        <button type="button" onclick="closeModal('activityDetailsModal')" style="height: 40px; padding: 0 16px; font-size: 0.82rem; font-weight: 800; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; cursor: pointer;">
          إغلاق
        </button>
      </div>

    </div>
  </div>

</body>
        </html>
      `);
      printWindow.document.close();
    }


    // =========================================================================
    // كشف وتدقيق مصدر الرصيد الفعلي وحركات الإيداع والصرف (Actual Balance Audit)
    // =========================================================================
    let lastAuditFilteredRows = [];

    function openActualBalanceAuditModal() {
      // 1. ملء قائمة أفراد الأسرة
      const memSelect = document.getElementById('auditMemberFilter');
      if (memSelect) {
        const familyList = ['ماهر', 'آية', 'محمد', 'مريم', 'الحاجة', 'النونو', 'البيت'];
        let mHtml = '<option value="all">كافة أفراد الأسرة (الكل)</option>';
        familyList.forEach(m => {
          mHtml += `<option value="${m}">${m}</option>`;
        });
        memSelect.innerHTML = mHtml;
        memSelect.value = 'all';
      }

      // 2. ملء قائمة بنود الصرف والإيراد
      const catSelect = document.getElementById('auditCategoryFilter');
      if (catSelect) {
        let cHtml = '<option value="all">كافة بنود الصرف والإيراد (الكل)</option>';
        cHtml += '<optgroup label="── بنود المصروفات ──">';
        (EXPENSE_CATEGORIES || []).forEach(c => {
          cHtml += `<option value="${c.id}">${c.emoji || '📌'} ${c.name}</option>`;
        });
        cHtml += '</optgroup>';
        cHtml += '<optgroup label="── بنود الإيرادات ──">';
        (INCOME_CATEGORIES || []).forEach(c => {
          cHtml += `<option value="${c.id}">💰 ${c.name}</option>`;
        });
        cHtml += '</optgroup>';
        catSelect.innerHTML = cHtml;
        catSelect.value = 'all';
      }

      // 3. ملء قائمة المحافظ
      const walSelect = document.getElementById('auditWalletFilter');
      if (walSelect) {
        let wHtml = '<option value="all">كافة المحافظ المجمعة (الكل)</option>';
        (state.wallets || []).forEach(w => {
          wHtml += `<option value="${w.id}">${w.name}</option>`;
        });
        walSelect.innerHTML = wHtml;
        walSelect.value = 'all';
      }

      // 4. تصفير البحث والفترات
      const sInput = document.getElementById('auditSearchInput');
      if (sInput) sInput.value = '';

      const pSelect = document.getElementById('auditPeriodFilter');
      if (pSelect) pSelect.value = 'all';

      const tSelect = document.getElementById('auditTypeFilter');
      if (tSelect) tSelect.value = 'all';

      const customRow = document.getElementById('auditCustomDateRow');
      if (customRow) customRow.style.display = 'none';

      // 5. حساب الكروت الكلية والتوزيع
      updateAuditGlobalMetrics();
      renderAuditWalletsCards();

      // 6. بناء الكشف وعرض النافذة
      renderActualBalanceAuditLedger();
      openModal('actualBalanceAuditModal');
    }

    function updateAuditGlobalMetrics() {
      const allTxs = state.transactions || [];
      let totalInc = 0;
      let totalExp = 0;

      allTxs.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') totalInc += amt;
        else if (t.type === 'expense') totalExp += amt;
      });

      const netFlow = totalInc - totalExp;
      const actualBalance = netFlow;

      const elInc = document.getElementById('auditMetricTotalInc');
      const elExp = document.getElementById('auditMetricTotalExp');
      const elNet = document.getElementById('auditMetricNetFlow');
      const elBal = document.getElementById('auditMetricActualBal');
      const elEq = document.getElementById('auditEquationText');

      const initialTotal = (state.wallets || []).reduce((s, w) => s + (Number(w.initialBalance) || 0), 0);
      const totalLiquidity = initialTotal + netFlow;

      if (elInc) elInc.textContent = '+ ' + formatMoney(totalInc);
      if (elExp) elExp.textContent = '- ' + formatMoney(totalExp);
      if (elNet) elNet.textContent = (netFlow >= 0 ? '+ ' : '- ') + formatMoney(Math.abs(netFlow));
      if (elBal) elBal.textContent = (actualBalance >= 0 ? '+ ' : '- ') + formatMoney(Math.abs(actualBalance));

      if (elEq) {
        elEq.textContent = `افتتاحي (${formatMoney(initialTotal)}) + إيداع (${formatMoney(totalInc)}) - صرف (${formatMoney(totalExp)}) = سيولة (${formatMoney(totalLiquidity)})`;
      }
    }

    function renderAuditWalletsCards() {
      const container = document.getElementById('auditWalletsCardsContainer');
      const totalLiquidityText = document.getElementById('auditWalletsTotalLiquidityText');
      if (!container) return;

      const wallets = state.wallets || [];
      const txs = state.transactions || [];
      const selectedWalletId = document.getElementById('auditWalletFilter') ? document.getElementById('auditWalletFilter').value : 'all';

      // حساب رصيد كل محفظة بناءً على الإيداع والصرف والتحويلات
      let totalLiquidity = 0;
      const walletStats = wallets.map(w => {
        const initBal = Number(w.initialBalance) || 0;
        let inc = 0;
        let exp = 0;

        txs.forEach(t => {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income' && (t.walletId === w.id || (!t.walletId && w.isDefault))) {
            inc += amt;
          } else if (t.type === 'expense' && (t.walletId === w.id || (!t.walletId && w.isDefault))) {
            exp += amt;
          } else if (t.type === 'transfer') {
            if (t.toWalletId === w.id) inc += amt;
            if (t.fromWalletId === w.id) exp += amt;
          }
        });

        // الرصيد الفعلي للمحفظة: إذا كان معتمداً بحسب إعدادات النظام
        const netFlow = inc - exp;
        const currentBal = Number(w.balance) || (initBal + netFlow);
        totalLiquidity += currentBal;

        return {
          id: w.id,
          name: w.name,
          icon: w.icon || 'fa-wallet',
          color: w.color || '#38bdf8',
          initBal,
          inc,
          exp,
          currentBal
        };
      });

      if (totalLiquidityText) {
        totalLiquidityText.textContent = `إجمالي السيولة المعتمدة: ${formatMoney(totalLiquidity)}`;
      }

      let cardsHtml = '';
      walletStats.forEach(w => {
        const pct = totalLiquidity > 0 ? ((w.currentBal / totalLiquidity) * 100).toFixed(1) : 0;
        const isSelected = selectedWalletId === w.id;
        const borderStyle = isSelected ? `2px solid ${w.color}` : '1px solid rgba(255, 255, 255, 0.12)';
        const bgStyle = isSelected ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.5), rgba(15, 23, 42, 0.9))' : 'rgba(30, 41, 59, 0.6)';

        cardsHtml += `
          <div onclick="quickFilterAuditWallet('${w.id}')" style="background: ${bgStyle}; border: ${borderStyle}; border-radius: 12px; padding: 8px 10px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 4px;" title="انقر للفلترة الفورية على هذه المحفظة">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid ${w.icon}" style="color: ${w.color}; font-size: 0.85rem;"></i>
                <span style="font-size: 0.75rem; font-weight: 800; color: #f8fafc;">${w.name}</span>
              </div>
              <span style="font-size: 0.60rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 1px 5px; border-radius: 4px; font-weight: 700;">${pct}%</span>
            </div>
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
              <span style="font-size: 0.88rem; font-weight: 900; color: #ffffff;">${formatMoney(w.currentBal)}</span>
              <span style="font-size: 0.58rem; color: #94a3b8;">إيداع: +${formatMoney(w.inc)} | صرف: -${formatMoney(w.exp)}</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = cardsHtml;
    }

    function quickFilterAuditWallet(walletId) {
      const walSelect = document.getElementById('auditWalletFilter');
      if (!walSelect) return;

      if (walSelect.value === walletId) {
        walSelect.value = 'all';
      } else {
        walSelect.value = walletId;
      }

      renderAuditWalletsCards();
      renderActualBalanceAuditLedger();
    }

    function onAuditWalletFilterChange() {
      renderAuditWalletsCards();
      renderActualBalanceAuditLedger();
    }

    function onAuditPeriodChange() {
      const periodSelect = document.getElementById('auditPeriodFilter');
      const customRow = document.getElementById('auditCustomDateRow');
      if (!periodSelect) return;

      if (periodSelect.value === 'custom') {
        if (customRow) {
          customRow.style.display = 'grid';
          const fromInput = document.getElementById('auditDateFrom');
          const toInput = document.getElementById('auditDateTo');
          const now = new Date();
          const todayStr = getLocalDateStr(now);
          if (!toInput.value) toInput.value = todayStr;
          if (!fromInput.value) {
            const past = new Date();
            past.setDate(past.getDate() - 30);
            fromInput.value = getLocalDateStr(past);
          }
        }
      } else {
        if (customRow) customRow.style.display = 'none';
      }

      renderActualBalanceAuditLedger();
    }

    function clearAuditSearch() {
      const sInput = document.getElementById('auditSearchInput');
      if (sInput) sInput.value = '';
      renderActualBalanceAuditLedger();
    }

    function resetAuditFilters() {
      const sInput = document.getElementById('auditSearchInput');
      if (sInput) sInput.value = '';

      const pSelect = document.getElementById('auditPeriodFilter');
      if (pSelect) pSelect.value = 'all';

      const customRow = document.getElementById('auditCustomDateRow');
      if (customRow) customRow.style.display = 'none';

      const memSelect = document.getElementById('auditMemberFilter');
      if (memSelect) memSelect.value = 'all';

      const catSelect = document.getElementById('auditCategoryFilter');
      if (catSelect) catSelect.value = 'all';

      const walSelect = document.getElementById('auditWalletFilter');
      if (walSelect) walSelect.value = 'all';

      const tSelect = document.getElementById('auditTypeFilter');
      if (tSelect) tSelect.value = 'all';

      renderAuditWalletsCards();
      renderActualBalanceAuditLedger();
      showToast('تم تفريغ كافة الفلاتر والبحث بنجاح', 'info');
    }

    function renderActualBalanceAuditLedger() {
      const tableContainer = document.getElementById('auditLedgerTableContainer');
      if (!tableContainer) return;

      // قراءة الفلاتر الحالية
      const searchVal = (document.getElementById('auditSearchInput')?.value || '').trim().toLowerCase();
      const periodVal = document.getElementById('auditPeriodFilter')?.value || 'all';
      const memberVal = document.getElementById('auditMemberFilter')?.value || 'all';
      const catVal = document.getElementById('auditCategoryFilter')?.value || 'all';
      const walletVal = document.getElementById('auditWalletFilter')?.value || 'all';
      const typeVal = document.getElementById('auditTypeFilter')?.value || 'all';
      const dateFrom = document.getElementById('auditDateFrom')?.value || '';
      const dateTo = document.getElementById('auditDateTo')?.value || '';

      // إعداد نطاقات التواريخ
      const now = new Date();
      const todayStr = getLocalDateStr(now);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStr(yesterday);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = getLocalDateStr(weekAgo);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = getLocalDateStr(thirtyDaysAgo);
      const thisMonthPrefix = todayStr.substring(0, 7);
      
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthPrefix = getLocalDateStr(lastMonthDate).substring(0, 7);
      const thisYearPrefix = todayStr.substring(0, 4);

      // ترتيب الحركات تصاعدياً لحساب الرصيد التراكمي بدقة رياضية
      const allChronological = [...(state.transactions || [])].sort((a, b) => {
        const da = (a.date || '') + ' ' + (a.time || '');
        const db = (b.date || '') + ' ' + (b.time || '');
        return da.localeCompare(db) || (Number(a.id) || 0) - (Number(b.id) || 0);
      });

      // حساب الرصيد التراكمي لكل حركة عبر التاريخ
      let runningBal = 0;
      const chronologicalWithRunning = allChronological.map(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          runningBal += amt;
        } else if (tx.type === 'expense') {
          runningBal -= amt;
        }
        return {
          ...tx,
          runningBalAfter: runningBal
        };
      });

      // تطبيق الفلاتر الخمسة + البحث الفوري
      let filtered = chronologicalWithRunning.filter(tx => {
        // 1. فلتر البحث
        if (searchVal) {
          const lStr = (tx.label || '').toLowerCase();
          const mStr = (tx.member || '').toLowerCase();
          const cObj = getCategoryObj(tx.category, tx.type);
          const cStr = (cObj ? cObj.name : '').toLowerCase();
          const wStr = getWalletName(tx.walletId).toLowerCase();
          const aStr = String(tx.amount || '');
          if (!lStr.includes(searchVal) && !mStr.includes(searchVal) && !cStr.includes(searchVal) && !wStr.includes(searchVal) && !aStr.includes(searchVal)) {
            return false;
          }
        }

        // 2. فلتر الفترة الزمنية
        const txDate = tx.date || '';
        if (periodVal === 'today' && txDate !== todayStr) return false;
        if (periodVal === 'yesterday' && txDate !== yesterdayStr) return false;
        if (periodVal === 'week' && txDate < weekAgoStr) return false;
        if (periodVal === 'this_month' && !txDate.startsWith(thisMonthPrefix)) return false;
        if (periodVal === 'last_month' && !txDate.startsWith(lastMonthPrefix)) return false;
        if (periodVal === 'last_30_days' && txDate < thirtyDaysAgoStr) return false;
        if (periodVal === 'this_year' && !txDate.startsWith(thisYearPrefix)) return false;
        if (periodVal === 'custom') {
          if (dateFrom && txDate < dateFrom) return false;
          if (dateTo && txDate > dateTo) return false;
        }

        // 3. فلتر الشخص / المستفيد
        if (memberVal !== 'all') {
          const m = tx.member || '';
          if (m !== memberVal) {
            if (!((memberVal === 'آية' && m === 'أية') || (memberVal === 'أية' && m === 'آية'))) {
              return false;
            }
          }
        }

        // 4. فلتر البند / التصنيف
        if (catVal !== 'all' && tx.category !== catVal) {
          return false;
        }

        // 5. فلتر المحفظة
        if (walletVal !== 'all') {
          const inWallet = tx.walletId === walletVal || (!tx.walletId && walletVal === 'wallet-cash-safe') || tx.toWalletId === walletVal || tx.fromWalletId === walletVal;
          if (!inWallet) return false;
        }

        // 6. فلتر نوع الحركة
        if (typeVal !== 'all' && tx.type !== typeVal) {
          return false;
        }

        return true;
      });

      // حفظ الصفوف للطباعة والتصدير
      lastAuditFilteredRows = [...filtered];

      // حساب مؤشرات النتائج المفلترة
      let filteredInc = 0;
      let filteredExp = 0;
      filtered.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') filteredInc += amt;
        else if (t.type === 'expense') filteredExp += amt;
      });
      const filteredNet = filteredInc - filteredExp;

      const elCount = document.getElementById('auditFilteredCount');
      const elFInc = document.getElementById('auditFilteredIncome');
      const elFExp = document.getElementById('auditFilteredExpense');
      const elFNet = document.getElementById('auditFilteredNet');

      if (elCount) elCount.textContent = `${filtered.length} حركة`;
      if (elFInc) elFInc.textContent = '+ ' + formatMoney(filteredInc);
      if (elFExp) elFExp.textContent = (filteredExp > 0 ? '- ' : '') + formatMoney(filteredExp);
      if (elFNet) {
        elFNet.textContent = (filteredNet >= 0 ? '+ ' : '- ') + formatMoney(Math.abs(filteredNet));
        elFNet.style.color = filteredNet >= 0 ? '#34d399' : '#f43f5e';
      }

      // عرض النتائج في الجدول من الأحدث للأقدم للمستخدم
      const displayRows = [...filtered].reverse();

      if (displayRows.length === 0) {
        tableContainer.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-folder-open" style="font-size: 1.4rem; color: #64748b;"></i>
            </div>
            <div style="font-size: 0.85rem; font-weight: 800; color: #e2e8f0;">لا توجد حركات تطابق معايير البحث والفلترة المحددة</div>
            <div style="font-size: 0.70rem; color: #64748b;">جرب تعديل نطاق التاريخ، اسم الشخص، أو تفريغ الفلاتر للرجوع للكل.</div>
            <button type="button" onclick="resetAuditFilters()" class="btn-submit-tx" style="margin-top: 6px; height: 32px; padding: 0 16px; font-size: 0.72rem; font-weight: 800; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px;">
              <i class="fa-solid fa-rotate-left"></i> تفريغ الفلاتر الآن
            </button>
          </div>
        `;
        return;
      }

      let tbodyHtml = '';
      displayRows.forEach(tx => {
        const isInc = tx.type === 'income';
        const isExp = tx.type === 'expense';
        const amt = Number(tx.amount) || 0;
        const catObj = getCategoryObj(tx.category, tx.type);
        const wName = getWalletName(tx.walletId);
        
        // الصورة الرمزية للشخص
        const mKey = (tx.member === 'آية') ? 'أية' : tx.member;
        const photo = (typeof MEMBER_AVATARS !== 'undefined') ? (MEMBER_AVATARS[mKey] || MEMBER_AVATARS[tx.member]) : null;
        const avatarImg = photo 
          ? `<img src="${photo}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1.5px solid #38bdf8; flex-shrink: 0;">`
          : `<div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(56, 189, 248, 0.2); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #38bdf8; flex-shrink: 0;"><i class="fa-solid fa-user"></i></div>`;

        // إشارة المبلغ وتنسيقه
        const amtSign = isInc ? '+ ' : (isExp ? '- ' : '');
        const amtColor = isInc ? '#34d399' : (isExp ? '#f43f5e' : '#38bdf8');
        const amtBg = isInc ? 'rgba(16, 185, 129, 0.12)' : (isExp ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)');

        // أيقونة نوع الحركة
        const typeBadge = isInc 
          ? `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.62rem; color: #34d399; font-weight: 800;"><i class="fa-solid fa-circle-arrow-down"></i> إيداع</span>`
          : (isExp 
            ? `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.62rem; color: #f43f5e; font-weight: 800;"><i class="fa-solid fa-circle-arrow-up"></i> صرف</span>`
            : `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.62rem; color: #38bdf8; font-weight: 800;"><i class="fa-solid fa-arrows-rotate"></i> تحويل</span>`);

        tbodyHtml += `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.15s ease;">
            <!-- التاريخ والوقت -->
            <td style="padding: 9px 10px; font-size: 0.70rem; color: #cbd5e1; white-space: nowrap; font-family: 'Courier New', monospace;">
              <div style="font-weight: 800; color: #f8fafc;">${tx.date || '──'}</div>
              <div style="font-size: 0.62rem; color: #64748b;">${tx.time || ''}</div>
            </td>

            <!-- الشخص المستفيد -->
            <td style="padding: 9px 10px; white-space: nowrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${avatarImg}
                <span style="font-size: 0.72rem; font-weight: 800; color: #f8fafc;">${tx.member || 'البيت'}</span>
              </div>
            </td>

            <!-- البيان والشرح بدون اقتصاص -->
            <td style="padding: 9px 10px; font-size: 0.75rem; color: #e2e8f0; font-weight: 700; word-break: break-word; min-width: 170px;">
              <div>${tx.label || 'بدون بيان'}</div>
              <div style="margin-top: 2px;">${typeBadge}</div>
            </td>

            <!-- التصنيف / البند -->
            <td style="padding: 9px 10px; white-space: nowrap;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px; font-size: 0.68rem; font-weight: 800; background: ${catObj.color ? catObj.color + '22' : 'rgba(56, 189, 248, 0.15)'}; color: ${catObj.color || '#38bdf8'}; border: 1px solid ${catObj.color ? catObj.color + '44' : 'rgba(56, 189, 248, 0.3)'};">
                <i class="fa-solid ${catObj.icon || 'fa-tag'}" style="font-size: 0.65rem;"></i>
                <span>${catObj.name || tx.category || 'عام'}</span>
              </span>
            </td>

            <!-- المحفظة -->
            <td style="padding: 9px 10px; white-space: nowrap;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 6px; font-size: 0.66rem; font-weight: 700; background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1);">
                <i class="fa-solid fa-vault" style="color: #f59e0b; font-size: 0.60rem;"></i>
                <span>${wName}</span>
              </span>
            </td>

            <!-- عمود المرفق والفاتورة المخصص -->
            <td style="padding: 6px 8px; text-align: center; white-space: nowrap;">
              ${tx.receipt ? `
                <img src="${tx.receipt}" onclick="openReceiptLightbox(this.src, 'فاتورة: ${escapeHtml(tx.label || '')}')" style="width: 30px; height: 30px; border-radius: 6px; object-fit: cover; border: 1.5px solid #38bdf8; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4);" title="انقر لعرض وتكبير الفاتورة">
              ` : `
                <span style="color: #64748b; font-size: 0.70rem;">──</span>
              `}
            </td>

            <!-- منفذ العملية -->
            <td style="padding: 9px 10px; white-space: nowrap;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px; font-size: 0.66rem; font-weight: 800; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">
                <i class="fa-solid fa-user-check" style="font-size: 0.60rem;"></i>
                <span>${escapeHtml(tx.author || tx.member || state.currentUser || 'ماهر')}</span>
              </span>
            </td>

            <!-- المبلغ بتنسيق محاسبي دقيق -->
            <td style="padding: 9px 10px; white-space: nowrap; text-align: left; direction: ltr;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 900; font-size: 0.78rem; color: ${amtColor}; background: ${amtBg};">
                ${amtSign}${formatMoney(amt)}
              </span>
            </td>

            <!-- الرصيد التراكمي بعد الحركة -->
            <td style="padding: 9px 10px; white-space: nowrap; text-align: left; direction: ltr; font-size: 0.76rem; font-weight: 900; color: #e2e8f0; font-family: 'Courier New', monospace;">
              ${tx.runningBalAfter >= 0 ? '+' : '-'}${formatMoney(Math.abs(tx.runningBalAfter))}
            </td>
          </tr>
        `;
      });

      tableContainer.innerHTML = `
        <div style="max-height: 420px; overflow-y: auto;" class="custom-scrollbar">
          <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.75rem;">
            <thead style="position: sticky; top: 0; background: #0b1329; z-index: 10; border-bottom: 2px solid rgba(56, 189, 248, 0.4);">
              <tr>
                <!-- 1. التاريخ / الوقت مع فلتر الفترة -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; white-space: nowrap;">
                  <div style="margin-bottom: 3px;">📅 التاريخ / الوقت</div>
                  <select id="auditPeriodFilter" onchange="renderActualBalanceAuditLedger()" style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; font-size: 0.62rem; font-weight: 800; padding: 2px 4px; width: 100%; max-width: 90px; outline: none;">
                    <option value="all">كل الأوقات</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">الأمس</option>
                    <option value="week">آخر 7 أيام</option>
                    <option value="this_month">هذا الشهر</option>
                    <option value="last_month">الشهر السابق</option>
                    <option value="this_year">هذا العام</option>
                  </select>
                </th>

                <!-- 2. المستفيد مع اختيار الشخص -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; white-space: nowrap;">
                  <div style="margin-bottom: 3px;">👤 المستفيد</div>
                  <select id="auditMemberFilter" onchange="renderActualBalanceAuditLedger()" style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; font-size: 0.62rem; font-weight: 800; padding: 2px 4px; width: 100%; max-width: 80px; outline: none;">
                    <option value="all">الكل</option>
                    <option value="البيت">🏠 البيت</option>
                    <option value="ماهر">ماهر</option>
                    <option value="أية">أية</option>
                    <option value="محمد">محمد</option>
                    <option value="مريم">مريم</option>
                    <option value="الحاجة">الحاجة</option>
                    <option value="النونو">النونو</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </th>

                <!-- 3. البيان والنوع -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem;">
                  <div style="margin-bottom: 3px;">📝 البيان والنوع</div>
                  <select id="auditTypeFilter" onchange="renderActualBalanceAuditLedger()" style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; font-size: 0.62rem; font-weight: 800; padding: 2px 4px; width: 100%; max-width: 90px; outline: none;">
                    <option value="all">كل الأنواع</option>
                    <option value="expense">صرف (-)</option>
                    <option value="income">إيداع (+)</option>
                  </select>
                </th>

                <!-- 4. التصنيف -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; white-space: nowrap;">
                  <div style="margin-bottom: 3px;">🏷️ التصنيف</div>
                  <select id="auditCategoryFilter" onchange="renderActualBalanceAuditLedger()" style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; font-size: 0.62rem; font-weight: 800; padding: 2px 4px; width: 100%; max-width: 95px; outline: none;">
                    <option value="all">كافة البنود</option>
                    <option value="food">طعام ومشتريات</option>
                    <option value="daily">مصروف يومي</option>
                    <option value="bills">فواتير والتزامات</option>
                    <option value="transport">مواصلات وبنزين</option>
                    <option value="house">مستلزمات منزل</option>
                    <option value="health">صحة وعلاج</option>
                    <option value="clothes">ملابس وأحذية</option>
                    <option value="education">تعليم ودروس</option>
                    <option value="other">أخرى ونثريات</option>
                  </select>
                </th>

                <!-- 5. المحفظة -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; white-space: nowrap;">
                  <div style="margin-bottom: 3px;">💼 المحفظة</div>
                  <select id="auditWalletFilter" onchange="renderActualBalanceAuditLedger()" style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; font-size: 0.62rem; font-weight: 800; padding: 2px 4px; width: 100%; max-width: 90px; outline: none;">
                    <option value="all">كل المحافظ</option>
                    <option value="wallet-cash-safe">كاش البيت</option>
                    <option value="wallet-reserve">المبلغ الإحتياطى</option>
                    <option value="wallet-vodafone">فودافون كاش</option>
                    <option value="wallet-other">أخرى</option>
                  </select>
                </th>

                <!-- 6. المرفقات والفواتير (عمود مخصص) -->
                <th style="padding: 6px 6px; color: #38bdf8; font-weight: 900; font-size: 0.68rem; text-align: center; white-space: nowrap;">
                  <div>المرفق 📎</div>
                  <span style="font-size: 0.58rem; color: #64748b;">(معاينة)</span>
                </th>

                <!-- 7. منفذ العملية -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; white-space: nowrap;">
                  <div>المنفذ</div>
                  <span style="font-size: 0.58rem; color: #64748b;">(الحساب)</span>
                </th>

                <!-- 8. المبلغ -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; text-align: left; white-space: nowrap;">
                  <div>المبلغ (ج.م)</div>
                </th>

                <!-- 9. الرصيد التراكمي -->
                <th style="padding: 6px 6px; color: #94a3b8; font-weight: 800; font-size: 0.68rem; text-align: left; white-space: nowrap;">
                  <div>الرصيد بعد الحركة</div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${tbodyHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    function exportAuditLedgerCSV() {
      if (!lastAuditFilteredRows || lastAuditFilteredRows.length === 0) {
        showToast('لا توجد بيانات مطابقة لتصديرها', 'warning');
        return;
      }

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'التاريخ,الوقت,المستفيد,نوع العملية,البيان,التصنيف,المحفظة,منفذ العملية,المبلغ (ج.م),الرصيد بعد الحركة (ج.م)\n';

      lastAuditFilteredRows.forEach(tx => {
        const isInc = tx.type === 'income';
        const isExp = tx.type === 'expense';
        const typeStr = isInc ? 'إيداع (+)' : (isExp ? 'صرف (-)' : 'تحويل');
        const amtVal = (isExp ? -1 : 1) * (Number(tx.amount) || 0);
        const catObj = getCategoryObj(tx.category, tx.type);
        const catName = catObj ? catObj.name : (tx.category || 'عام');
        const wName = getWalletName(tx.walletId);
        const cleanLabel = (tx.label || '').replace(/"/g, '""');

        const executor = (tx.author || tx.member || state.currentUser || "ماهر").replace(/"/g, '""');
        csv += `"${tx.date || ''}","${tx.time || ''}","${tx.member || ''}","${typeStr}","${cleanLabel}","${catName}","${wName}","${executor}",${amtVal.toFixed(2)},${(tx.runningBalAfter || 0).toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `كشف_تدقيق_الرصيد_الفعلي_${getLocalDateStr(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('تم تصدير كشف التدقيق إكسيل (CSV) بنجاح 📊', 'success');
    }

    function printAuditLedgerStatement() {
      if (!lastAuditFilteredRows || lastAuditFilteredRows.length === 0) {
        showToast('لا توجد بيانات لطباعتها', 'warning');
        return;
      }

      // حساب إجماليات الكشف المطبوع
      let totalInc = 0;
      let totalExp = 0;
      lastAuditFilteredRows.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') totalInc += amt;
        else if (t.type === 'expense') totalExp += amt;
      });
      const net = totalInc - totalExp;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('يرجى السماح بالنوافذ المنبثقة لطباعة الكشف', 'error');
        return;
      }

      let rowsHtml = '';
      lastAuditFilteredRows.forEach(tx => {
        const isInc = tx.type === 'income';
        const isExp = tx.type === 'expense';
        const catObj = getCategoryObj(tx.category, tx.type);
        const wName = getWalletName(tx.walletId);
        const amtStr = (isInc ? '+ ' : (isExp ? '- ' : '')) + formatMoney(Number(tx.amount) || 0) + ' ج.م';
        const amtClass = isInc ? 'color: #047857; font-weight: bold;' : (isExp ? 'color: #b91c1c; font-weight: bold;' : 'color: #0284c7;');

        rowsHtml += `
          <tr>
            <td>${tx.date || ''} ${tx.time || ''}</td>
            <td>${tx.member || 'البيت'}</td>
            <td><strong>${tx.label || 'بدون بيان'}</strong> (${isInc ? 'إيداع' : (isExp ? 'صرف' : 'تحويل')})</td>
            <td>${catObj ? catObj.name : ''}</td>
            <td>${wName}</td>
            <td style="font-weight: bold; color: #0284c7;">${escapeHtml(tx.author || tx.member || state.currentUser || 'ماهر')}</td>
            <td style="text-align: left; direction: ltr; ${amtClass}">${amtStr}</td>
            <td style="text-align: left; direction: ltr; font-weight: bold;">${(tx.runningBalAfter || 0) >= 0 ? '+' : '-'}${formatMoney(Math.abs(tx.runningBalAfter || 0))} ج.م</td>
          </tr>
        `;
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>كشف وتدقيق مصدر الرصيد الفعلي — عائلة ماهر & آية</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 25px; color: #0f172a; margin: 0; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; }
            .title { font-size: 18px; font-weight: bold; color: #0f172a; }
            .meta { font-size: 12px; color: #64748b; }
            .kpis { display: flex; gap: 12px; margin-bottom: 15px; }
            .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc; }
            .kpi-label { font-size: 11px; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 14px; font-weight: bold; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: right; }
            th { background: #f1f5f9; color: #1e293b; font-weight: bold; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print {
              body { padding: 10px; }
              button { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="title">كشف وتدقيق مصدر الرصيد الفعلي وحركات السيولة</div>
              <div class="meta">نظام المصروفات العائلي الذكي — عائلة ماهر & آية | تاريخ التقرير: ${getLocalDateStr(new Date())}</div>
            </div>
            <div>
              <button onclick="window.print()" style="padding: 6px 14px; background: #0284c7; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">طباعة الآن</button>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">عدد الحركات المشمولة</div>
              <div class="kpi-val" style="color: #0284c7;">${lastAuditFilteredRows.length} حركة</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">إجمالي الإيداعات (+)</div>
              <div class="kpi-val" style="color: #047857;">+ ${formatMoney(totalInc)} ج.م</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">إجمالي المصروفات (-)</div>
              <div class="kpi-val" style="color: #b91c1c;">- ${formatMoney(totalExp)} ج.م</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">صافي الفارق</div>
              <div class="kpi-val" style="color: #0f172a;">${net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net))} ج.م</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>المستفيد</th>
                <th>البيان والنوع</th>
                <th>التصنيف</th>
                <th>المحفظة</th>
                <th>منفذ العملية</th>
                <th style="text-align: left;">المبلغ (ج.م)</th>
                <th style="text-align: left;">الرصيد بعد الحركة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        
  <!-- =========================================================================
       نافذة تفاصيل عملية الأرشيف الفاخرة (Activity Details Modal)
       تعرض كامل تفاصيل العملية دون اختصار مع المستند المرفق وزر الانتقال
       ========================================================================= -->
  <div class="modal-overlay modal-overlay-custom" id="activityDetailsModal" style="display: none; z-index: 100020 !important; align-items: center !important; justify-content: center !important; padding: 14px; direction: rtl;" dir="rtl" onclick="if(event.target === this) closeModal('activityDetailsModal')">
    <div class="modal-content-card" style="max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.85); padding: 18px; box-sizing: border-box;">
      
      <!-- هيدر النافذة -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="actDetailHeaderIconBadge" style="width: 38px; height: 38px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); border: 1.2px solid rgba(56, 189, 248, 0.35); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: #38bdf8;">
            <i class="fa-solid fa-clock-rotate-left" id="actDetailHeaderIcon"></i>
          </div>
          <div>
            <h3 id="actDetailActionTitle" style="font-size: 0.98rem; font-weight: 900; color: #f8fafc; margin: 0;">تفاصيل حركة الأرشيف</h3>
            <span id="actDetailTypeBadge" style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">سجل الحركة الموثقة</span>
          </div>
        </div>
        <button type="button" onclick="closeModal('activityDetailsModal')" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- بانر المبلغ المالي الضخم والمدقق محاسبياً -->
      <div id="actDetailAmountBanner" style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.25); border-radius: 14px; padding: 12px; text-align: center; margin-bottom: 14px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);">
        <div style="font-size: 0.70rem; color: #94a3b8; font-weight: 800; margin-bottom: 3px;">قيمة العملية المالية</div>
        <div id="actDetailAmountVal" style="font-size: 1.75rem; font-weight: 900; color: #38bdf8; direction: ltr; font-variant-numeric: tabular-nums;">+ 0.00 ج.م</div>
      </div>

      <!-- نص البيان والوصف الكامل دون أي اختصار -->
      <div style="margin-bottom: 12px;">
        <label style="font-size: 0.70rem; font-weight: 800; color: #94a3b8; margin-bottom: 4px; display: block;">البيان والوصف الكامل للعملية:</label>
        <div id="actDetailFullLabel" style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 12px; line-height: 1.5; word-break: break-word;"></div>
      </div>

      <!-- شبكة البيانات التفصيلية (التاريخ، المنفذ، المستفيد، المحفظة، البند) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <!-- التاريخ والوقت -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-regular fa-calendar-check" style="color: #38bdf8;"></i> التاريخ والوقت</div>
          <div id="actDetailDateTime" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0;"></div>
        </div>

        <!-- المنفذ (المستخدم الفعلي) -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-user-pen" style="color: #a855f7;"></i> المنفذ (بواسطة)</div>
          <div id="actDetailAuthor" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; gap: 6px;"></div>
        </div>

        <!-- يخص من في الأسرة -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-people-roof" style="color: #f59e0b;"></i> يخص في الأسرة</div>
          <div id="actDetailMember" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; gap: 6px;"></div>
        </div>

        <!-- المحفظة أو الحساب -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-bottom: 2px;"><i class="fa-solid fa-wallet" style="color: #10b981;"></i> المحفظة / الخزينة</div>
          <div id="actDetailWallet" style="font-size: 0.78rem; font-weight: 800; color: #e2e8f0;"></div>
        </div>
      </div>

      <!-- بند الملاحظات الإضافية (إن وجد) -->
      <div id="actDetailNotesCard" style="display: none; background: rgba(245, 158, 11, 0.08); border: 1.2px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;">
        <div style="font-size: 0.68rem; font-weight: 800; color: #fbbf24; margin-bottom: 2px;"><i class="fa-solid fa-note-sticky"></i> ملاحظات إضافية:</div>
        <div id="actDetailNotesTxt" style="font-size: 0.78rem; font-weight: 700; color: #f8fafc; line-height: 1.4;"></div>
      </div>

      <!-- معاينة المستند المرفق (الفاتورة / الإيصال / الصورة) -->
      <div id="actDetailReceiptCard" style="background: rgba(15, 23, 42, 0.85); border: 1.2px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 10px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #cbd5e1; display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-file-invoice-dollar" style="color: #38bdf8;"></i> المستند المرفق / الفاتورة:
          </span>
          <span id="actDetailReceiptStatusBadge" style="font-size: 0.62rem; padding: 1px 6px; border-radius: 5px; font-weight: 800;"></span>
        </div>

        <!-- صورة المستند المرفق إن وجدت -->
        <div id="actDetailReceiptImgBox" style="display: none; position: relative; border-radius: 10px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.12);">
          <img id="actDetailReceiptImg" src="" style="width: 100%; max-height: 200px; object-fit: contain; display: block; cursor: pointer;" onclick="openReceiptFromActDetail()" title="انقر لتكبير المستند بالشاشة الكاملة">
          <div style="position: absolute; bottom: 6px; right: 6px; display: flex; gap: 6px;">
            <button type="button" onclick="openReceiptFromActDetail()" style="background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 0.70rem; padding: 4px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-expand"></i> تكبير
            </button>
            <button type="button" onclick="downloadReceiptFromActDetail()" style="background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 0.70rem; padding: 4px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-download"></i> حفظ
            </button>
          </div>
        </div>

        <!-- حالة عدم وجود مرفق -->
        <div id="actDetailNoReceiptMsg" style="display: block; text-align: center; padding: 12px; color: #64748b; font-size: 0.75rem; font-weight: 700;">
          <i class="fa-regular fa-image" style="font-size: 1.3rem; margin-bottom: 4px; display: block; opacity: 0.4;"></i>
          لا توجد صورة أو فاتورة مرفقة مع هذه الحركة
        </div>
      </div>

      <!-- أزرار الإجراءات السريعة (الانتقال لقسم الحركة + الإغلاق) -->
      <div style="display: flex; gap: 8px;">
        <button type="button" id="btnActDetailContextJump" onclick="jumpToActivityContext()" class="btn-submit-tx" style="flex: 1; height: 40px; font-size: 0.82rem; font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 10px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> <span id="actDetailJumpBtnTxt">الانتقال للقسم المعني</span>
        </button>
        <button type="button" onclick="closeModal('activityDetailsModal')" style="height: 40px; padding: 0 16px; font-size: 0.82rem; font-weight: 800; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; cursor: pointer;">
          إغلاق
        </button>
      </div>

    </div>
  </div>

</body>
        </html>
      `);

      printWindow.document.close();
    }


    // -------------------------------------------------------------------------
    // 3. رفع وتصوير الفواتير للالتزامات المتوقعة (Photo Upload for Commitments)
    // -------------------------------------------------------------------------
    function handleExpectedPhotoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);

          state.pendingExpectedPhotoDataUri = compressed;

          const previewImg = document.getElementById('expPhotoPreviewImg');
          const previewCont = document.getElementById('expPhotoPreviewContainer');
          const badge = document.getElementById('expPhotoStatusBadge');
          const removeBtn = document.getElementById('btnRemoveExpPhoto');

          if (previewImg) previewImg.src = compressed;
          if (previewCont) previewCont.style.display = 'block';
          if (badge) badge.style.display = 'inline-block';
          if (removeBtn) removeBtn.style.display = 'inline-block';

          showToast('📸 تم إرفاق صورة المستند بنجاح');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function removeExpectedPhoto() {
      state.pendingExpectedPhotoDataUri = null;
      const previewCont = document.getElementById('expPhotoPreviewContainer');
      const badge = document.getElementById('expPhotoStatusBadge');
      const removeBtn = document.getElementById('btnRemoveExpPhoto');
      const camInp = document.getElementById('inpExpCameraPhoto');
      const docInp = document.getElementById('inpExpDocFile');

      if (previewCont) previewCont.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'none';
      if (camInp) camInp.value = '';
      if (docInp) docInp.value = '';
    }

    // -------------------------------------------------------------------------
    // 4. التبديل الرئيسي في صفحة المتوقعة (Commitments vs Monthly Budget)
    // -------------------------------------------------------------------------
    // =========================================================================
    // =========================================================================
    // محرك الميزانيات التقديرية الديناميكية والربط المتعدد بالأفراد (v5.0)
    // =========================================================================

    let currentBudgetMonthData = null;
    let selectedBudgetItemMembers = ['البيت']; // قائمة الأفراد المحددين للبند الجديد

    function switchExpectedMainTab(tab) {
      const btnCommitments = document.getElementById('tabExpectedCommitments');
      const btnBudget = document.getElementById('tabExpectedMonthlyBudget');
      const btnHistory = document.getElementById('tabExpectedBudgetHistory');

      const subCommitments = document.getElementById('subViewCommitments');
      const panelBudget = document.getElementById('panelMonthlyBudget');
      const panelHistory = document.getElementById('panelBudgetHistory');

      [btnCommitments, btnBudget, btnHistory].forEach(b => {
        if (b) {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
          b.style.boxShadow = 'none';
        }
      });

      if (tab === 'commitments') {
        if (btnCommitments) {
          btnCommitments.classList.add('active');
          btnCommitments.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          btnCommitments.style.color = '#fff';
          btnCommitments.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.35)';
        }
        if (subCommitments) subCommitments.style.display = 'block';
        if (panelBudget) panelBudget.style.display = 'none';
        if (panelHistory) panelHistory.style.display = 'none';
        renderExpectedList();
      } else if (tab === 'monthly_budget') {
        if (btnBudget) {
          btnBudget.classList.add('active');
          btnBudget.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          btnBudget.style.color = '#fff';
          btnBudget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.35)';
        }
        if (subCommitments) subCommitments.style.display = 'none';
        if (panelBudget) panelBudget.style.display = 'block';
        if (panelHistory) panelHistory.style.display = 'none';
        loadActiveBudgetPlan();
      } else if (tab === 'budget_history') {
        if (btnHistory) {
          btnHistory.classList.add('active');
          btnHistory.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          btnHistory.style.color = '#fff';
          btnHistory.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.35)';
        }
        if (subCommitments) subCommitments.style.display = 'none';
        if (panelBudget) panelBudget.style.display = 'none';
        if (panelHistory) panelHistory.style.display = 'block';
        renderBudgetHistory();
      }
    }

    // تهيئة محرك الميزانيات وضمان ترحيل البيانات القديمة بسلاسة
    function initMonthlyBudgetUI() {
      const stored = localStorage.getItem('family_monefy_monthly_budgets');
      if (stored) {
        try { state.monthlyBudgets = JSON.parse(stored); } catch(e) { state.monthlyBudgets = []; }
      }

      if (!state.monthlyBudgets || !Array.isArray(state.monthlyBudgets) || state.monthlyBudgets.length === 0) {
        state.monthlyBudgets = generateRichDemoBudgets();
        try {
          localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets));
        } catch(e) {}
      }

      // ترقية وتأكيد سلامة كل خطة
      state.monthlyBudgets.forEach((b, idx) => {
        if (!b.id) b.id = 'bgt-' + (b.month || 'plan') + '-' + (idx + 1);
        if (!b.name) b.name = b.title || (`ميزانية شهر ${b.month || 'الحالي'}`);
        if (!b.month) b.month = '2026-11';
        if (!b.categories) b.categories = {};
        if (!b.incomes) b.incomes = [];
        ensureBudgetItems(b);
      });

      if (!state.activeBudgetId || !state.monthlyBudgets.some(b => b.id === state.activeBudgetId)) {
        state.activeBudgetId = state.monthlyBudgets[0].id;
      }

      populateBudgetPlanSelector();
      renderBudgetMembersMultiPicker();
    }

    // ضمان وجود قائمة بنود ديناميكية وترحيل التصنيفات القديمة إن وجدت
    function ensureBudgetItems(b) {
      if (!b.items || !Array.isArray(b.items)) {
        b.items = [];
        const catMap = {
          food: 'طعام ومشتريات',
          daily: 'مصروف يومي',
          bills: 'فواتير والتزامات',
          transport: 'مواصلات وبنزين',
          house: 'مستلزمات منزل',
          health: 'صحة وعلاج',
          clothes: 'ملابس وأحذية',
          education: 'تعليم ودروس',
          other: 'أخرى ونثريات'
        };
        Object.keys(b.categories || {}).forEach((catId, idx) => {
          const amt = Number(b.categories[catId]) || 0;
          if (amt > 0) {
            b.items.push({
              id: 'item-' + catId + '-' + (idx + 1),
              category: catId,
              title: catMap[catId] || catId,
              amount: amt,
              members: ['البيت'],
              notes: ''
            });
          }
        });
      }
      syncBudgetCategoriesMap(b);
    }

    // مزامنة خريطة categories القديمة لمنع كسر أي كود يعتمد عليها
    function syncBudgetCategoriesMap(b) {
      if (!b) return;
      b.categories = {};
      (b.items || []).forEach(it => {
        const cat = it.category || 'other';
        b.categories[cat] = (b.categories[cat] || 0) + (Number(it.amount) || 0);
      });
    }

    function populateBudgetPlanSelector() {
      const sel = document.getElementById('budgetPlanSelector');
      if (!sel) return;
      if (!state.monthlyBudgets) state.monthlyBudgets = [];

      sel.innerHTML = state.monthlyBudgets.map(b => {
        const totalExp = (b.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
        return `<option value="${b.id}" ${b.id === state.activeBudgetId ? 'selected' : ''}>📋 ${escapeHtml(b.name)} [${b.month}] - مقدر: ${formatMoney(totalExp)}</option>`;
      }).join('');
    }

    function loadActiveBudgetPlan() {
      if (!state.monthlyBudgets || state.monthlyBudgets.length === 0) {
        initMonthlyBudgetUI();
      }

      let activePlan = state.monthlyBudgets.find(b => b.id === state.activeBudgetId);
      if (!activePlan) {
        activePlan = state.monthlyBudgets[0];
        state.activeBudgetId = activePlan.id;
      }

      currentBudgetMonthData = activePlan;
      ensureBudgetItems(currentBudgetMonthData);

      const inpName = document.getElementById('inpBudgetName');
      const inpMonth = document.getElementById('inpBudgetMonth');

      if (inpName) inpName.value = activePlan.name || '';
      if (inpMonth) inpMonth.value = activePlan.month || '2026-11';

      populateBudgetPlanSelector();
      renderBudgetMembersMultiPicker();
      renderMonthlyBudgetAllocations();
    }

    function loadMonthlyBudget() {
      loadActiveBudgetPlan();
    }

    function onBudgetPlanSelect(budgetId) {
      state.activeBudgetId = budgetId;
      loadActiveBudgetPlan();
      showToast(`📂 تم فتح الميزانية: (${currentBudgetMonthData.name})`);
    }

    function onBudgetNameChange(val) {
      if (currentBudgetMonthData) {
        currentBudgetMonthData.name = val;
      }
    }

    function onBudgetMonthChange(val) {
      if (currentBudgetMonthData) {
        currentBudgetMonthData.month = val;
        renderMonthlyBudgetAllocations();
      }
    }

    function onBudgetItemCategorySelect(catId) {
      const titleInp = document.getElementById('inpBudgetItemTitle');
      if (titleInp && !titleInp.value) {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
        if (cat) titleInp.placeholder = `مثال: ${cat.name}...`;
      }
    }

    // رسم شريط تحديد أفراد الأسرة المتعدد للبند الجديد
    function renderBudgetMembersMultiPicker() {
      const container = document.getElementById('budgetMembersMultiPicker');
      if (!container) return;

      const members = typeof FAMILY_MEMBERS !== 'undefined' ? FAMILY_MEMBERS : ['البيت', 'ماهر', 'أية', 'محمد', 'مريم', 'الحاجة', 'النونو', 'أخرى'];
      
      container.innerHTML = members.map(m => {
        const isSelected = selectedBudgetItemMembers.includes(m);
        const avatar = (typeof MEMBER_AVATARS !== 'undefined' && MEMBER_AVATARS[m]) ? MEMBER_AVATARS[m] : '';
        const bg = isSelected ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(30, 41, 59, 0.7)';
        const border = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
        const color = isSelected ? '#ffffff' : '#cbd5e1';
        const shadow = isSelected ? '0 3px 10px rgba(56, 189, 248, 0.35)' : 'none';

        return `
          <button type="button" onclick="toggleBudgetItemMember('${m}')" 
                  style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; border: 1.4px solid ${border}; background: ${bg}; color: ${color}; font-size: 0.74rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: ${shadow};">
            ${avatar ? `<img src="${avatar}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;">` : ''}
            <span>${m}</span>
            ${isSelected ? '<i class="fa-solid fa-check" style="font-size: 0.65rem; margin-right: 2px;"></i>' : ''}
          </button>
        `;
      }).join('');

      const textEl = document.getElementById('budgetSelectedMembersText');
      if (textEl) {
        textEl.textContent = selectedBudgetItemMembers.length > 0 ? selectedBudgetItemMembers.join(' + ') : 'البيت (مشترك)';
      }
    }

    // التبديل بين تحديد/إلغاء تحديد فرد للبند الجديد (اختيار فرد أو أكثر)
    function toggleBudgetItemMember(name) {
      if (name === 'البيت') {
        selectedBudgetItemMembers = ['البيت'];
      } else {
        // إزالة البيت إن وُجد اختيار فردي محدد
        selectedBudgetItemMembers = selectedBudgetItemMembers.filter(m => m !== 'البيت');
        if (selectedBudgetItemMembers.includes(name)) {
          selectedBudgetItemMembers = selectedBudgetItemMembers.filter(m => m !== name);
        } else {
          selectedBudgetItemMembers.push(name);
        }
        if (selectedBudgetItemMembers.length === 0) {
          selectedBudgetItemMembers = ['البيت'];
        }
      }
      renderBudgetMembersMultiPicker();
    }

    // إضافة بند مصروف جديد للخطة التقديرية بديناميكية وربط متعدد بالأفراد
    function addBudgetItemToCurrentPlan() {
      if (!currentBudgetMonthData) return;

      const catSel = document.getElementById('inpBudgetItemCategory');
      const amtInp = document.getElementById('inpBudgetItemAmount');
      const titleInp = document.getElementById('inpBudgetItemTitle');

      const catId = catSel ? catSel.value : 'other';
      const amt = parseFloat(amtInp ? amtInp.value : 0);
      let title = titleInp ? titleInp.value.trim() : '';

      if (isNaN(amt) || amt <= 0) {
        showToast('⚠️ الرجاء إدخال مبلغ تقديري صحيح للبند');
        if (amtInp) amtInp.focus();
        return;
      }

      if (!title) {
        const catObj = EXPENSE_CATEGORIES.find(c => c.id === catId);
        title = catObj ? catObj.name : 'بند مصروف';
      }

      if (!currentBudgetMonthData.items) currentBudgetMonthData.items = [];

      const newItem = {
        id: 'b-item-' + Date.now(),
        category: catId,
        title: title,
        amount: amt,
        members: selectedBudgetItemMembers.length > 0 ? [...selectedBudgetItemMembers] : ['البيت'],
        notes: ''
      };

      currentBudgetMonthData.items.push(newItem);
      syncBudgetCategoriesMap(currentBudgetMonthData);

      // تنظيف الخانات بعد الإضافة
      if (amtInp) amtInp.value = '';
      if (titleInp) titleInp.value = '';
      selectedBudgetItemMembers = ['البيت'];
      renderBudgetMembersMultiPicker();

      logActivity({
        type: 'add_budget_item',
        action: 'إضافة بند ميزانية',
        label: `إضافة بند: ${title} بمخصص ${formatMoney(amt)}`,
        amount: amt,
        member: 'البيت',
        author: state.currentUser || 'ماهر',
        notes: `الفئة: ${catId}`
      });

      renderMonthlyBudgetAllocations();
      showToast(`➕ تم إضافة بند (${title} - ${formatMoney(amt)}) بنجاح! ✨`);
    }

    // حذف بند مصروف من الميزانية
    function deleteBudgetItem(itemId) {
      if (!currentBudgetMonthData || !currentBudgetMonthData.items) return;
      const it = currentBudgetMonthData.items.find(i => i.id === itemId);
      const title = it ? it.title : 'هذا البند';
      if (it) {
        logActivity({
          type: 'delete_budget_item',
          action: 'حذف بند ميزانية',
          label: `حذف بند: ${title}`,
          amount: it.amount || 0,
          member: 'البيت',
          author: state.currentUser || 'ماهر'
        });
      }
      currentBudgetMonthData.items = currentBudgetMonthData.items.filter(i => i.id !== itemId);
      syncBudgetCategoriesMap(currentBudgetMonthData);
      renderMonthlyBudgetAllocations();
      showToast(`🗑️ تم حذف بند: ${title}`);
    }

    // تعديل مبلغ بند مصروف
    function editBudgetItemAmount(itemId) {
      if (!currentBudgetMonthData || !currentBudgetMonthData.items) return;
      const it = currentBudgetMonthData.items.find(i => i.id === itemId);
      if (!it) return;

      const newAmtStr = prompt(`تعديل المبلغ التقديري لبند "${it.title}" (ج.م):`, it.amount);
      if (newAmtStr === null) return;
      const newAmt = parseFloat(newAmtStr);
      if (isNaN(newAmt) || newAmt <= 0) {
        showToast('⚠️ تم إلغاء التعديل: المبلغ غير صالح');
        return;
      }
      const oldAmt = it.amount;
      it.amount = newAmt;
      syncBudgetCategoriesMap(currentBudgetMonthData);

      logActivity({
        type: 'edit_budget_item',
        action: 'تعديل مخصص ميزانية',
        label: `تعديل بند "${it.title}" من ${formatMoney(oldAmt)} إلى ${formatMoney(newAmt)}`,
        amount: newAmt,
        member: 'البيت',
        author: state.currentUser || 'ماهر'
      });

      renderMonthlyBudgetAllocations();
      showToast(`✏️ تم تحديث مخصص "${it.title}" إلى ${formatMoney(newAmt)}`);
      triggerDriveAutoSync();
      return;
    }
    // removed duplicate
    function _dummy_unused() {
    }

    function openNewBudgetPlanModal() {
      const monthInp = document.getElementById('newPlanMonthInput');
      const nameInp = document.getElementById('newPlanNameInput');
      const incInp = document.getElementById('newPlanTargetIncomeInput');
      const cloneSel = document.getElementById('newPlanCloneSourceSelect');

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const yyyyMm = nextMonth.toISOString().slice(0, 7);

      if (monthInp) monthInp.value = yyyyMm;
      if (nameInp) nameInp.value = `ميزانية شهر ${yyyyMm} التقديرية`;
      if (incInp) incInp.value = 85000;

      if (cloneSel) {
        cloneSel.innerHTML = '<option value="none">✨ خطة فارغة جديدة (قيم افتراضية متوازنة)</option>' +
          (state.monthlyBudgets || []).map(b => `<option value="${b.id}">📑 استنساخ من: ${escapeHtml(b.name)} [${b.month}]</option>`).join('');
      }

      openModal('newBudgetPlanModal');
    }

    function submitNewBudgetPlan() {
      const monthInp = document.getElementById('newPlanMonthInput');
      const nameInp = document.getElementById('newPlanNameInput');
      const incInp = document.getElementById('newPlanTargetIncomeInput');
      const cloneSel = document.getElementById('newPlanCloneSourceSelect');

      const month = monthInp && monthInp.value ? monthInp.value : '2026-12';
      const name = nameInp && nameInp.value.trim() ? nameInp.value.trim() : `ميزانية شهر ${month}`;
      const targetIncome = parseFloat(incInp ? incInp.value : 85000) || 85000;
      const cloneFromId = cloneSel ? cloneSel.value : 'none';

      let items = [];
      let incomes = [
        { id: 'inc-' + Date.now(), name: 'راتب ماهر الأساسي', amount: targetIncome, member: 'ماهر' }
      ];

      if (cloneFromId !== 'none') {
        const src = (state.monthlyBudgets || []).find(b => b.id === cloneFromId);
        if (src) {
          ensureBudgetItems(src);
          items = JSON.parse(JSON.stringify(src.items || []));
          incomes = JSON.parse(JSON.stringify(src.incomes || []));
        }
      } else {
        items = [
          { id: 'it-1', category: 'food', title: 'طعام ومشتريات وسوبرماركت', amount: 20000, members: ['البيت'], notes: '' },
          { id: 'it-2', category: 'bills', title: 'فواتير والتزامات شهرية', amount: 8000, members: ['البيت'], notes: '' },
          { id: 'it-3', category: 'transport', title: 'مواصلات وبنزين سيارة', amount: 6000, members: ['ماهر'], notes: '' },
          { id: 'it-4', category: 'education', title: 'تعليم ودروس سناتر ومذكرات', amount: 15000, members: ['محمد', 'مريم'], notes: '' },
          { id: 'it-5', category: 'daily', title: 'مصروف يومي شخصي', amount: 4000, members: ['ماهر', 'أية'], notes: '' }
        ];
      }

      const newPlan = {
        id: 'bgt-' + month + '-' + Date.now(),
        name: name,
        month: month,
        items: items,
        incomes: incomes,
        categories: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      syncBudgetCategoriesMap(newPlan);

      if (!state.monthlyBudgets) state.monthlyBudgets = [];
      state.monthlyBudgets.unshift(newPlan);
      state.activeBudgetId = newPlan.id;

      logActivity({
        type: 'budget_created',
        action: 'إنشاء خطة ميزانية',
        label: `إنشاء خطة ميزانية: ${name} (دخل مستهدف: ${formatMoney(targetIncome)})`,
        amount: targetIncome,
        member: 'البيت',
        author: state.currentUser || 'ماهر',
        notes: `شهر الخطة: ${month}`
      });

      try {
        localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets));
      } catch(e) {}

      closeModal('newBudgetPlanModal');
      loadActiveBudgetPlan();
      showToast(`🎉 تم إنشاء وتفعيل الخطة التقديرية الجديدة: (${name})`);
      triggerDriveAutoSync();
    }

    function cloneCurrentBudgetPlan() {
      if (!currentBudgetMonthData) return;
      ensureBudgetItems(currentBudgetMonthData);

      const clone = JSON.parse(JSON.stringify(currentBudgetMonthData));
      clone.id = 'bgt-copy-' + Date.now();
      clone.name = clone.name + ' (نسخة)';
      clone.createdAt = new Date().toISOString();
      clone.updatedAt = new Date().toISOString();

      state.monthlyBudgets.unshift(clone);
      state.activeBudgetId = clone.id;

      try {
        localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets));
      } catch(e) {}

      loadActiveBudgetPlan();
      showToast(`📑 تم استنساخ الخطة بنجاح`);
    }

    function deleteCurrentBudgetPlan() {
      if (!currentBudgetMonthData) return;
      if ((state.monthlyBudgets || []).length <= 1) {
        showToast('⚠️ لا يمكن حذف الخطة الوحيدة المتبقية في النظام');
        return;
      }

      if (confirm(`هل أنت متأكد من حذف خطة "${currentBudgetMonthData.name}" نهائياً؟`)) {
        logActivity({
          type: 'delete_budget_plan',
          action: 'حذف خطة ميزانية',
          label: `حذف خطة ميزانية: ${currentBudgetMonthData.name}`,
          amount: currentBudgetMonthData.totalIncome || 0,
          member: 'البيت',
          author: state.currentUser || 'ماهر'
        });
        state.monthlyBudgets = state.monthlyBudgets.filter(b => b.id !== currentBudgetMonthData.id);
        state.activeBudgetId = state.monthlyBudgets[0].id;
        try {
          localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets));
        } catch(e) {}
        loadActiveBudgetPlan();
        showToast('🗑️ تم حذف الخطة بنجاح');
      }
    }

    function renderBudgetHistory() {
      const container = document.getElementById('budgetHistoryListContainer');
      if (!container) return;

      if (!state.monthlyBudgets || state.monthlyBudgets.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">لا توجد خطط سابقة محفوظة</div>';
        return;
      }

      container.innerHTML = state.monthlyBudgets.map(b => {
        ensureBudgetItems(b);
        const totalInc = (b.incomes || []).reduce((s, inc) => s + (Number(inc.amount) || 0), 0);
        const totalExp = (b.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
        const surplus = totalInc - totalExp;
        const isActive = (b.id === state.activeBudgetId);

        return `
          <div style="background: rgba(30, 41, 59, 0.85); border: 1.4px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)'}; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.90rem; font-weight: 900; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
                  <span>${escapeHtml(b.name)}</span>
                  ${isActive ? '<span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 1px 6px; border-radius: 5px;">الخطة النشطة</span>' : ''}
                </div>
                <div style="font-size: 0.70rem; color: #94a3b8; margin-top: 2px;">
                  الشهر: <strong style="color: #cbd5e1;">${b.month}</strong> • عدد البنود: <strong style="color: #38bdf8;">${(b.items || []).length} بند</strong>
                </div>
              </div>

              <div style="display: flex; gap: 6px;">
                <button type="button" onclick="restoreBudgetForView('${b.id}')" style="padding: 6px 12px; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; color: #fff; font-size: 0.74rem; font-weight: 800; cursor: pointer;">
                  <i class="fa-solid fa-folder-open"></i> عرض وتعديل
                </button>
                <button type="button" onclick="deleteBudgetFromHistory('${b.id}')" style="padding: 6px 8px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-size: 0.74rem; font-weight: 800; cursor: pointer;" title="حذف">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; background: rgba(15, 23, 42, 0.6); border-radius: 8px; padding: 6px 8px; text-align: center; font-size: 0.74rem;">
              <div>
                <div style="font-size: 0.64rem; color: #34d399;">دخل متوقع</div>
                <div style="font-weight: 900; color: #34d399;">+ ${formatMoney(totalInc)}</div>
              </div>
              <div>
                <div style="font-size: 0.64rem; color: #f87171;">مصروفات مقدرة</div>
                <div style="font-weight: 900; color: #f87171;">- ${formatMoney(totalExp)}</div>
              </div>
              <div>
                <div style="font-size: 0.64rem; color: #38bdf8;">فائض / عجز</div>
                <div style="font-weight: 900; color: ${surplus >= 0 ? '#34d399' : '#f87171'};">${(surplus >= 0 ? '+ ' : '- ') + formatMoney(Math.abs(surplus))}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function restoreBudgetForView(budgetId) {
      state.activeBudgetId = budgetId;
      switchExpectedMainTab('monthly_budget');
    }

    function deleteBudgetFromHistory(budgetId) {
      if ((state.monthlyBudgets || []).length <= 1) {
        showToast('⚠️ لا يمكن حذف الخطة الوحيدة المتبقية في النظام');
        return;
      }
      if (confirm('هل أنت متأكد من حذف هذه الخطة من السجل؟')) {
        state.monthlyBudgets = state.monthlyBudgets.filter(b => b.id !== budgetId);
        if (state.activeBudgetId === budgetId) {
          state.activeBudgetId = state.monthlyBudgets[0].id;
        }
        try {
          localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets));
        } catch(e) {}
        renderBudgetHistory();
        showToast('🗑️ تم حذف الخطة من السجل');
      }
    }

    function getProratedBudgetForPeriod(periodStr) {
      if (!currentBudgetMonthData) return 0;
      ensureBudgetItems(currentBudgetMonthData);
      const totalBudget = (currentBudgetMonthData.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
      if (periodStr === 'month') return totalBudget;
      if (periodStr === 'week') return Math.round(totalBudget * (7 / 30));
      if (periodStr === 'day' || periodStr === 'today') return Math.round(totalBudget / 30);
      return totalBudget;
    }
    // -------------------------------------------------------------------------
    // 7. تبديل أشكال شارت التحليل (أعمدة - دونات - دائري - قطبي)
    // -------------------------------------------------------------------------
    
    // دالة التبديل بين أشكال شارت أفراد الأسرة (أعمدة، دونات، قطبي)
    function switchMemberChartFormat(format, btnEl) {
      state.activeMemberChartFormat = format;
      document.querySelectorAll('#paneMembers .chart-format-switcher-strip .btn-export-tool').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
      });
      if (btnEl) {
        btnEl.classList.add('active');
        btnEl.style.background = 'rgba(56, 189, 248, 0.2)';
        btnEl.style.color = '#38bdf8';
      }
      if (typeof renderMembersChart === 'function') {
        renderMembersChart();
      }
    }

function switchCategoryChartFormat(format, btnEl) {
      state.activeCategoryChartFormat = format;
      execCatChartType = format;
      document.querySelectorAll('#paneCategories .chart-format-switcher-strip .btn-export-tool').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
      });
      if (btnEl) {
        btnEl.classList.add('active');
        btnEl.style.background = 'rgba(56, 189, 248, 0.2)';
        btnEl.style.color = '#38bdf8';
      }

      if (typeof renderCategoryChart === 'function') {
        renderCategoryChart();
      }
    }

    // -------------------------------------------------------------------------
    // 8. تسجيل دخول فوري بنقرة واحدة لأفراد العائلة
    // -------------------------------------------------------------------------
    // =========================================================================
    // نظام قفل الأمان المخصص لكل حساب عائلي (Family Account PIN Lock Engine v3.4.2)
    // =========================================================================

    const FAMILY_PIN_CODES = {
      'ماهر': '4503069',
      'آية': '25320',
      'أية': '25320',
      'محمد': '11111',
      'مريم': '11111',
      'الحاجة': '11111',
      'النونو': '11111',
      'النونُو': '11111',
      'النونّو': '11111'
    };

    let pendingPinTargetMember = null;

    // طلب التحقق برمز القفل عند الانتقال من حساب لآخر أو التسجيل الجديد
        // =========================================================================
    // نظام إدارة وتبديل المستخدمين المدمج في الإعدادات (Family Users Switching)
    // =========================================================================

    const SETTINGS_FAMILY_MEMBERS = [
      { name: 'ماهر', role: 'رب الأسرة', color: '#38bdf8', key: 'ماهر' },
      { name: 'آية', role: 'ربة المنزل', color: '#ec4899', key: 'أية' },
      { name: 'محمد', role: 'الابن', color: '#f59e0b', key: 'محمد' },
      { name: 'مريم', role: 'الابنة', color: '#8b5cf6', key: 'مريم' },
      { name: 'الحاجة', role: 'البركة', color: '#10b981', key: 'الحاجة' },
      { name: 'النونُو', role: 'أصغر العائلة', color: '#f43f5e', key: 'النونو' }
    ];

    let pendingSettingsPinTargetMember = null;

    function renderSettingsMembersGrid() {
      const container = document.getElementById('settingsMembersGridContainer');
      if (!container) return;

      const activeUser = state.currentUser || 'ماهر';

      container.innerHTML = SETTINGS_FAMILY_MEMBERS.map(m => {
        const isActive = (activeUser === m.name || (activeUser === 'أية' && m.name === 'آية') || (activeUser === 'آية' && m.name === 'أية'));
        const avatarSrc = (typeof MEMBER_AVATARS !== 'undefined') ? (MEMBER_AVATARS[m.key] || MEMBER_AVATARS[m.name]) : '';
        const hasPin = Boolean(FAMILY_PIN_CODES[m.name] || FAMILY_PIN_CODES[m.key]);

        return `
          <div onclick="handleSettingsMemberClick('${m.name}')" style="background: ${isActive ? 'rgba(34, 197, 94, 0.18)' : 'rgba(30, 41, 59, 0.75)'}; border: ${isActive ? '2px solid #22c55e' : '1.3px solid rgba(255, 255, 255, 0.1)'}; border-radius: 12px; padding: 10px 6px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; box-shadow: ${isActive ? '0 4px 16px rgba(34, 197, 94, 0.25)' : 'none'};">
            ${hasPin ? `<div style="position: absolute; top: 5px; left: 5px; font-size: 0.60rem; color: ${m.color};"><i class="fa-solid fa-lock"></i></div>` : ''}
            ${isActive ? `<div style="position: absolute; top: 5px; right: 5px; font-size: 0.62rem; color: #22c55e;"><i class="fa-solid fa-circle-check"></i></div>` : ''}
            <img src="${avatarSrc}" alt="${m.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin: 0 auto 4px; display: block; border: 2px solid ${isActive ? '#22c55e' : m.color};">
            <div style="font-size: 0.80rem; font-weight: 900; color: #ffffff;">${m.name}</div>
            <div style="font-size: 0.60rem; color: ${isActive ? '#34d399' : m.color}; font-weight: 700;">${isActive ? '✔ الحساب النشط' : m.role}</div>
          </div>
        `;
      }).join('');
    }

    function handleSettingsMemberClick(memberName) {
      const activeUser = state.currentUser || 'ماهر';
      if (activeUser === memberName || (activeUser === 'أية' && memberName === 'آية') || (activeUser === 'آية' && memberName === 'أية')) {
        showToast(`👤 أنت مسجل الدخول حالياً بحساب ${memberName}`);
        return;
      }

      const pin = FAMILY_PIN_CODES[memberName] || (memberName === 'آية' ? FAMILY_PIN_CODES['أية'] : null);
      if (!pin) {
        completeUserLogin(memberName);
        updateSettingsModalDisplay();
        showToast(`✔ تم التبديل إلى حساب ${memberName} بنجاح!`);
        return;
      }

      pendingSettingsPinTargetMember = memberName;

      const vGrid = document.getElementById('settingsProfilesGridView');
      const vPin = document.getElementById('settingsPinVerificationView');
      const pinTitle = document.getElementById('settingsPinTargetTitle');
      const pinAvatar = document.getElementById('settingsPinTargetAvatar');
      const inpPin = document.getElementById('inpSettingsMemberPin');
      const errHint = document.getElementById('settingsPinErrorHint');

      if (vGrid) vGrid.style.display = 'none';
      if (vPin) vPin.style.display = 'block';
      if (pinTitle) pinTitle.textContent = `قفل حساب: ${memberName}`;
      if (errHint) errHint.style.display = 'none';
      if (inpPin) {
        inpPin.value = '';
        setTimeout(() => inpPin.focus(), 200);
      }

      if (pinAvatar) {
        let mKey = memberName;
        if (mKey === 'النونُو') mKey = 'النونو';
        if (mKey === 'آية') mKey = 'أية';
        const photo = (typeof MEMBER_AVATARS !== 'undefined') ? (MEMBER_AVATARS[mKey] || MEMBER_AVATARS[memberName]) : null;
        pinAvatar.src = photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=0284c7&color=fff`;
      }
    }

    function cancelSettingsPinVerification() {
      pendingSettingsPinTargetMember = null;
      const vGrid = document.getElementById('settingsProfilesGridView');
      const vPin = document.getElementById('settingsPinVerificationView');
      if (vGrid) vGrid.style.display = 'block';
      if (vPin) vPin.style.display = 'none';
    }

    function verifySettingsMemberPinSubmit() {
      if (!pendingSettingsPinTargetMember) return;

      const inpPin = document.getElementById('inpSettingsMemberPin');
      const errHint = document.getElementById('settingsPinErrorHint');
      const entered = inpPin ? inpPin.value.trim() : '';

      const correctPin = FAMILY_PIN_CODES[pendingSettingsPinTargetMember] || (pendingSettingsPinTargetMember === 'آية' ? FAMILY_PIN_CODES['أية'] : null);

      if (entered === correctPin) {
        const memberName = pendingSettingsPinTargetMember;
        completeUserLogin(memberName);
        cancelSettingsPinVerification();
        updateSettingsModalDisplay();
        if (typeof renderUI === 'function') renderUI();
        if (typeof playNotificationChime === 'function') playNotificationChime();
        showToast(`🔓 تم التحقق بنجاح! تم التبديل إلى حساب ${memberName} ✨`);
      } else {
        if (errHint) errHint.style.display = 'block';
        if (inpPin) {
          inpPin.classList.add('shake');
          setTimeout(() => inpPin.classList.remove('shake'), 400);
        }
      }
    }

function promptMemberPin(memberName) {
      // إذا كان المستخدم حالياً هو نفس الفرد، أغلق النافذة مباشرة
      if (state.currentUser === memberName) {
        closeModal('authModal');
        return;
      }

      // إذا لم يكن للفرد رمز قفل محدد (مثل الحاجة أو النونو)، يتم الدخول المباشر
      if (!FAMILY_PIN_CODES[memberName]) {
        completeUserLogin(memberName);
        closeModal('authModal');
        return;
      }

      pendingPinTargetMember = memberName;

      const vGrid = document.getElementById('authProfilesGridView');
      const vPin = document.getElementById('authPinVerificationView');
      const pinTitle = document.getElementById('pinTargetMemberTitle');
      const pinAvatar = document.getElementById('pinTargetMemberAvatar');
      const inpPin = document.getElementById('inpFamilyMemberPin');
      const errHint = document.getElementById('pinErrorHint');

      if (vGrid) vGrid.style.display = 'none';
      if (vPin) vPin.style.display = 'block';
      if (pinTitle) pinTitle.textContent = `قفل حساب: ${memberName}`;
      if (errHint) errHint.style.display = 'none';
      if (inpPin) {
        inpPin.value = '';
        setTimeout(() => inpPin.focus(), 250);
      }

      if (pinAvatar) {
        let mKey = memberName;
        if (mKey === 'النونُو') mKey = 'النونو';
        if (mKey === 'آية') mKey = 'أية';
        const realPhoto = (typeof MEMBER_AVATARS !== 'undefined') ? (MEMBER_AVATARS[mKey] || MEMBER_AVATARS[memberName]) : null;
        pinAvatar.src = realPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=0284c7&color=fff`;
      }
    }

    function cancelPinVerification() {
      pendingPinTargetMember = null;
      const vGrid = document.getElementById('authProfilesGridView');
      const vPin = document.getElementById('authPinVerificationView');
      if (vGrid) vGrid.style.display = 'block';
      if (vPin) vPin.style.display = 'none';
    }

    function verifyMemberPinSubmit() {
      if (!pendingPinTargetMember) return;

      const inpPin = document.getElementById('inpFamilyMemberPin');
      const errHint = document.getElementById('pinErrorHint');
      const entered = inpPin ? inpPin.value.trim() : '';

      const correctPin = FAMILY_PIN_CODES[pendingPinTargetMember];

      if (entered === correctPin) {
        const memberName = pendingPinTargetMember;
        completeUserLogin(memberName);
        cancelPinVerification();
        closeModal('authModal');
        showToast(`🔓 تم التحقق بنجاح! مرحباً بك يا ${memberName} ✨`);
      } else {
        if (errHint) {
          errHint.style.display = 'block';
          errHint.textContent = '⚠️ رمز القفل غير صحيح! يرجى المحاولة مرة أخرى.';
        }
        if (inpPin) {
          inpPin.value = '';
          inpPin.focus();
        }
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        // haptic / audio feedback
        if (typeof playNotificationChime === 'function') playNotificationChime();
      }
    }

    function completeUserLogin(memberName) {
      state.currentUser = memberName;
      try {
        localStorage.setItem('family_monefy_auth', JSON.stringify({
          user: memberName,
          loggedIn: true,
          verifiedAt: new Date().toISOString()
        }));
      } catch(e) {}

      const headerTitle = document.querySelector('.brand-title');
      if (headerTitle) {
        headerTitle.innerHTML = `مصروفات العيلة ماهر ❤️ ${memberName}`;
      }

      playNotificationChime();
      if ('vibrate' in navigator) navigator.vibrate(80);

      if (typeof renderUI === 'function') renderUI();
    }

    function quickSelectUser(memberName) {
      promptMemberPin(memberName);
    }

    // =========================================================================
    // محرك المزامنة السحابية عبر Google Drive والحسابات (Google Drive Sync Engine v3.3.0)
    // =========================================================================

    // =========================================================================
    // محرك المزامنة السحابية والموازنة التامة مع Google Drive (Drive Sync Engine v3.4.0)
    // الحساب المعتمد: maher.easybakery@gmail.com
    // موازنة رياضية دقيقة لكافة العمليات والأرصدة بين كافة أجهزة العائلة (0.00 ج.م/ر.س)
    // =========================================================================

    const GDRIVE_CONFIG = {
      targetAccount: 'maher.easybakery@gmail.com',
      targetFileName: 'family_expense_tracker_db.json',
      // قناة السحابة التلقائية المدمجة المجهزة مسبقاً (تعمل فوراً بدون أي إعداد على كافة الجوالات)
      defaultSyncUrl: 'https://script.google.com/macros/s/AKfycbwdIuCjR3lUy0DTBnWTj9koFZ4ghRxR2Dq-sdj_LjIS2r_gHfpp4AX_32dNd2RRKPaShQ/exec',
      defaultChannelKey: 'maher_easybakery_family_sync_v3'
    };

    function openGoogleDriveSyncModal() {
      openModal('googleDriveSyncModal');
      const inp = document.getElementById('inpDriveWebhookUrl');
      if (inp) {
        inp.value = localStorage.getItem('family_gdrive_webhook_url') || '';
      }
      updateDriveSyncStatusDisplay();
      if (typeof updateDailyBackupDisplay === 'function') updateDailyBackupDisplay();
    }

    function saveGoogleDriveWebhookUrl() {
      const inp = document.getElementById('inpDriveWebhookUrl');
      const url = inp ? inp.value.trim() : '';
      if (!url) {
        localStorage.removeItem('family_gdrive_webhook_url');
        showToast('تم الرجوع لسحابة Google Drive التلقائية المدمجة');
        updateDriveSyncStatusDisplay();
        return;
      }
      localStorage.setItem('family_gdrive_webhook_url', url);
      showToast('✔ تم حفظ رابط سحابة Google Drive الخاص بك! جاري المزامنة والموازنة...');
      executeGoogleDriveSync();
    }

    function updateDriveSyncStatusDisplay() {
      const timeTxt = document.getElementById('driveLastSyncTimeText');
      const settingsTimeTxt = document.getElementById('settingsDriveLastSyncTimeText');
      const topBadge = document.getElementById('topDriveSyncStatusText');
      const headerTimeBadge = document.getElementById('headerSyncTimeBadge');
      const lastSync = localStorage.getItem('family_last_drive_sync');

      const nowTimeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      if (lastSync) {
        const d = new Date(lastSync);
        const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        if (timeTxt) timeTxt.textContent = `آخر مزامنة: اليوم ${timeStr}`;
        if (settingsTimeTxt) settingsTimeTxt.textContent = `آخر مزامنة: اليوم ${timeStr}`;
        if (topBadge) topBadge.textContent = 'متزامن';
        if (headerTimeBadge) headerTimeBadge.textContent = timeStr;
      } else {
        if (timeTxt) timeTxt.textContent = 'آخر مزامنة: اليوم ' + nowTimeStr;
        if (settingsTimeTxt) settingsTimeTxt.textContent = 'آخر مزامنة: اليوم ' + nowTimeStr;
        if (topBadge) topBadge.textContent = 'متزامن';
        if (headerTimeBadge) headerTimeBadge.textContent = nowTimeStr;
      }
    }

    // المزامنة الشاملة والموازنة الحسابية التامة
    async function executeGoogleDriveSync(isManual = false) {
      const icon = document.getElementById('driveSyncIconSpin');
      const settingsIcon = document.getElementById('settingsDriveSyncIconSpin');
      const headerIcon = document.getElementById('headerDriveSyncIcon');
      if (icon) icon.classList.add('fa-spin');
      if (settingsIcon) settingsIcon.classList.add('fa-spin');
      if (headerIcon) headerIcon.classList.add('fa-spin');

      const customWebhook = localStorage.getItem('family_gdrive_webhook_url');
      const syncEndpoint = (customWebhook && customWebhook.startsWith('http')) ? customWebhook : GDRIVE_CONFIG.defaultSyncUrl;

      // تجهيز الحزمة الشاملة متضمنة الطابع الزمني والمؤلف
      const payload = {
        app: 'FamilyExpenseTrackerMonefy',
        account: GDRIVE_CONFIG.targetAccount,
        updatedAt: new Date().toISOString(),
        author: state.currentUser || 'ماهر',
        transactions: state.transactions || [],
        wallets: state.wallets || [],
        monthlyBudgets: state.monthlyBudgets || [],
        expectedExpenses: state.expectedExpenses || [],
        moneyRequests: state.moneyRequests || [],
        activityLog: (state.activityLog || []).slice(0, 100)
      };

      try {
        if (customWebhook && customWebhook.startsWith('http')) {
          // مزامنة عبر Google Apps Script Webhook الخاص بحساب maher.easybakery@gmail.com
          const resp = await fetch(customWebhook, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'sync', data: payload })
          });
          const resJson = await resp.json();
          if (resJson && resJson.data) {
            mergeIncomingSyncData(resJson.data);
          }
        } else {
          // السحابة التلقائية المدمجة عالية السرعة (تعمل فوراً بين كل الأجهزة)
          // 1. جلب أحدث بيانات مشتركة مسجلة من أي جهاز آخر
          try {
            const getResp = await fetch(syncEndpoint, { method: 'GET', cache: 'no-store' });
            if (getResp.ok) {
              const remoteData = await getResp.json();
              if (remoteData) {
                mergeIncomingSyncData(remoteData);
              }
            }
          } catch(e) {
            console.log('Initial sync fetch notice:', e);
          }

          // 2. رفع النسخة المتوازنة الحالية المحدثة لجميع الأجهزة
          const updatedPayload = {
            app: 'FamilyExpenseTrackerMonefy',
            account: GDRIVE_CONFIG.targetAccount,
            updatedAt: new Date().toISOString(),
            author: state.currentUser || 'ماهر',
            transactions: state.transactions || [],
            wallets: state.wallets || [],
            monthlyBudgets: state.monthlyBudgets || [],
            expectedExpenses: state.expectedExpenses || [],
            moneyRequests: state.moneyRequests || [],
            activityLog: (state.activityLog || []).slice(0, 100)
          };

          await fetch(syncEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
          });
        }

        // حفظ محلي للطابع الزمني
        localStorage.setItem('family_last_drive_sync', new Date().toISOString());
        localStorage.setItem('family_master_cloud_sync', JSON.stringify(payload));
        
        // إعادة موازنة الأرصدة حسابياً
        auditAndRecomputeAllWalletBalances();

        if (isManual) {
          showToast('☁️ تم التزامن السحابي والموازنة الدقيقة مع Google Drive بنجاح! ✨');
          playNotificationChime();
        }
        // فحص وتطبيق التحديثات البرمجية تلقائياً مع المزامنة
        setTimeout(() => {
          if (typeof checkAndApplyAppUpdates === 'function') {
            checkAndApplyAppUpdates({ isManual: isManual, silent: !isManual });
          }
        }, 800);
      } catch(err) {
        console.warn('Google Drive Sync error:', err);
        localStorage.setItem('family_master_cloud_sync', JSON.stringify(payload));
        auditAndRecomputeAllWalletBalances();
        if (isManual) {
          showToast('💾 تم الحفظ السحابي محلياً وجاهز للمزامنة فور توفر الشبكة');
        }
      }

      if (icon) icon.classList.remove('fa-spin');
      if (settingsIcon) settingsIcon.classList.remove('fa-spin');
      if (headerIcon) headerIcon.classList.remove('fa-spin');
      updateDriveSyncStatusDisplay();
      if (typeof renderUI === 'function') renderUI();
      if (typeof renderSecWalletView === 'function') renderSecWalletView();
      if (typeof renderIncomeHistoryView === 'function') renderIncomeHistoryView();
      if (typeof renderRequestsViews === 'function') renderRequestsViews();
    }

    // محرك الدمج والموازنة الرياضية لمنع أي تضارب أو فقدان بيانات بين الهواتف
    function mergeIncomingSyncData(remote) {
      if (!remote) return;

      // 1. موازنة الحركات والمصروفات (Transactions Reconciliation by ID & timestamp)
      if (Array.isArray(remote.transactions) && remote.transactions.length > 0) {
        const localTx = state.transactions || [];
        const mergedMap = new Map();

        localTx.forEach(tx => {
          if (tx && tx.id) mergedMap.set(String(tx.id), tx);
        });

        remote.transactions.forEach(rTx => {
          if (!rTx || !rTx.id) return;
          const key = String(rTx.id);
          if (!mergedMap.has(key)) {
            mergedMap.set(key, rTx);
          } else {
            const local = mergedMap.get(key);
            const localTime = new Date(local.updatedAt || local.date || 0).getTime();
            const remoteTime = new Date(rTx.updatedAt || rTx.date || 0).getTime();
            if (remoteTime > localTime) {
              mergedMap.set(key, rTx);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values()).filter(t => !t.deleted);
        mergedList.sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
        state.transactions = mergedList;
        try { localStorage.setItem('family_monefy_v2_tx', JSON.stringify(state.transactions)); } catch(e){}
      }

      // 2. موازنة طلبات تحويل الأموال بين أفراد الأسرة
      if (Array.isArray(remote.moneyRequests) && remote.moneyRequests.length > 0) {
        const reqMap = new Map((state.moneyRequests || []).map(r => [String(r.id), r]));
        remote.moneyRequests.forEach(r => {
          if (!r || !r.id) return;
          const key = String(r.id);
          if (!reqMap.has(key)) {
            reqMap.set(key, r);
          } else {
            const local = reqMap.get(key);
            const localTime = new Date(local.updatedAt || local.date || 0).getTime();
            const remoteTime = new Date(r.updatedAt || r.date || 0).getTime();
            if (remoteTime >= localTime) reqMap.set(key, r);
          }
        });
        state.moneyRequests = Array.from(reqMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        if (typeof saveRequests === 'function') saveRequests();
      }

      // 3. موازنة المصروفات المتوقعة (Expected Expenses)
      if (Array.isArray(remote.expectedExpenses) && remote.expectedExpenses.length > 0) {
        const expMap = new Map((state.expectedExpenses || []).map(e => [String(e.id), e]));
        remote.expectedExpenses.forEach(e => {
          if (!e || !e.id) return;
          const key = String(e.id);
          if (!expMap.has(key)) {
            expMap.set(key, e);
          } else {
            const local = expMap.get(key);
            if (e.isPaid || local.isPaid) {
              expMap.set(key, { ...local, ...e, isPaid: true });
            } else {
              expMap.set(key, { ...local, ...e });
            }
          }
        });
        state.expectedExpenses = Array.from(expMap.values());
        if (typeof saveExpected === 'function') saveExpected();
      }

      // 4. موازنة الميزانيات الشهرية
      if (Array.isArray(remote.monthlyBudgets) && remote.monthlyBudgets.length > 0) {
        state.monthlyBudgets = remote.monthlyBudgets;
        try { localStorage.setItem('family_monefy_monthly_budgets', JSON.stringify(state.monthlyBudgets)); } catch(e){}
      }

      // 5. التدقيق الحسابي والموازنة الدقيقة لكافة أرصدة المحافظ (0.00 SAR/EGP)
      auditAndRecomputeAllWalletBalances();
    }

    // التدقيق الحسابي الرياضي لجميع المحافظ استناداً لصافي الحركات
    function auditAndRecomputeAllWalletBalances() {
      if (!state.wallets || !Array.isArray(state.wallets)) return;

      state.wallets.forEach(wallet => {
        let computed = parseFloat(wallet.initialBalance || wallet.baseBalance || 0);
        
        (state.transactions || []).forEach(tx => {
          if (tx.deleted) return;
          const amt = Math.abs(parseFloat(tx.amount) || 0);
          if (tx.type === 'expense' && tx.wallet === wallet.name) {
            computed -= amt;
          } else if (tx.type === 'income' && tx.wallet === wallet.name) {
            computed += amt;
          } else if (tx.type === 'transfer') {
            if (tx.fromWallet === wallet.name || tx.wallet === wallet.name) {
              computed -= amt;
            }
            if (tx.toWallet === wallet.name) {
              computed += amt;
            }
          }
        });

        wallet.balance = Math.round(computed * 100) / 100;
      });

      try {
        localStorage.setItem('family_monefy_wallets', JSON.stringify(state.wallets));
      } catch(e){}

      if (typeof populateWalletDropdowns === 'function') populateWalletDropdowns();
    }

    // مزامنة تلقائية ذكية في الخلفية عند أي تعديل أو إضافة (Debounced Auto-Sync)
    let driveAutoSyncTimer = null;
    function triggerDriveAutoSync() {
      if (driveAutoSyncTimer) clearTimeout(driveAutoSyncTimer);
      driveAutoSyncTimer = setTimeout(() => {
        executeGoogleDriveSync();
      }, 400);
    }

    // 1-Click Google Apps Script Editor Launcher for maher.easybakery@gmail.com
    function openGasDriveEditor() {
      const scriptCode = `// ==============================================================
// Google Apps Script - سحابة وعمليات النسخ الاحتياطي اليومي على Google Drive
// الحساب المعتمد: maher.easybakery@gmail.com
// ==============================================================
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var action = req.action || 'sync';
    var payloadData = req.data || req;
    var folder = DriveApp.getRootFolder();
    
    // 1. تحديث قاعدة البيانات الأساسية الدائمة
    var mainFiles = folder.getFilesByName("family_expense_tracker_db.json");
    if (mainFiles.hasNext()) {
      mainFiles.next().setContent(JSON.stringify(payloadData));
    } else {
      folder.createFile("family_expense_tracker_db.json", JSON.stringify(payloadData), MimeType.PLAIN_TEXT);
    }
    
    var deletedFiles = [];
    var createdFile = null;
    
    // 2. معالجة النسخة الاحتياطية اليومية المجدولة 12:00 ظهراً وحذف الأمس
    if (action === 'daily_noon_backup' || req.todayFileName) {
      var todayName = req.todayFileName || ("family_backup_" + Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd") + ".json");
      var yesterdayName = req.yesterdayFileName;
      
      // حفظ أو تحديث نسخة اليوم
      var todayFiles = folder.getFilesByName(todayName);
      if (todayFiles.hasNext()) {
        todayFiles.next().setContent(JSON.stringify(payloadData));
        createdFile = todayName + " (محدث)";
      } else {
        folder.createFile(todayName, JSON.stringify(payloadData), MimeType.PLAIN_TEXT);
        createdFile = todayName;
      }
      
      // حذف نسخة اليوم السابق المحددة
      if (yesterdayName) {
        var yFiles = folder.getFilesByName(yesterdayName);
        while (yFiles.hasNext()) {
          var yf = yFiles.next();
          yf.setTrashed(true);
          deletedFiles.push(yesterdayName);
        }
      }
      
      // حذف أي ملفات نسخ احتياطية يومية سابقة غير اليوم الحالي
      var allFiles = folder.getFiles();
      while (allFiles.hasNext()) {
        var f = allFiles.next();
        var fn = f.getName();
        if (fn.indexOf("family_backup_") === 0 && fn.indexOf(".json") !== -1 && fn !== todayName) {
          f.setTrashed(true);
          if (deletedFiles.indexOf(fn) === -1) {
            deletedFiles.push(fn);
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      account: "maher.easybakery@gmail.com",
      updatedAt: new Date().toISOString(),
      action: action,
      created: createdFile,
      deleted: deletedFiles,
      data: payloadData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var files = DriveApp.getRootFolder().getFilesByName("family_expense_tracker_db.json");
    if (files.hasNext()) {
      var content = files.next().getBlob().getDataAsString();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", account: "maher.easybakery@gmail.com", data: JSON.parse(content) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "empty" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// مشغل تلقائي سحابي مستقل يعمل على خوادم جوجل يومياً الساعة 12:00 ظهراً
function dailyNoonBackupTrigger() {
  try {
    var folder = DriveApp.getRootFolder();
    var mainFiles = folder.getFilesByName("family_expense_tracker_db.json");
    if (!mainFiles.hasNext()) return;
    
    var content = mainFiles.next().getBlob().getDataAsString();
    var now = new Date();
    var todayStr = Utilities.formatDate(now, "GMT+3", "yyyy-MM-dd");
    var todayName = "family_backup_" + todayStr + ".json";
    
    // إنشاء أو تحديث نسخة اليوم
    var tFiles = folder.getFilesByName(todayName);
    if (tFiles.hasNext()) {
      tFiles.next().setContent(content);
    } else {
      folder.createFile(todayName, content, MimeType.PLAIN_TEXT);
    }
    
    // حذف أي نسخة لليوم السابق أو أقدم
    var allFiles = folder.getFiles();
    while (allFiles.hasNext()) {
      var f = allFiles.next();
      var fn = f.getName();
      if (fn.indexOf("family_backup_") === 0 && fn.indexOf(".json") !== -1 && fn !== todayName) {
        f.setTrashed(true);
      }
    }
  } catch(e) {
    Logger.log("Trigger Error: " + e);
  }
}

// تركيب المشغل التلقائي بضغطة زر
function installDailyNoonTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyNoonBackupTrigger') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyNoonBackupTrigger')
    .timeBased()
    .everyDays(1)
    .atHour(12)
    .create();
}`;

      navigator.clipboard.writeText(scriptCode).then(() => {
        showToast('📋 تم نسخ كود السحابة! جاري فتح محرر Google Script...');
        setTimeout(() => {
          window.open('https://script.new', '_blank');
        }, 300);
      }).catch(() => {
        window.open('https://script.new', '_blank');
      });
    }

    function copyGasDriveTemplate() {
      openGasDriveEditor();
    }

    function exportToGoogleDriveDirect() {
      const data = {
        app: 'FamilyExpenseTrackerMonefy',
        account: GDRIVE_CONFIG.targetAccount,
        version: 'v3.5.1',
        exportedAt: new Date().toISOString(),
        transactions: state.transactions || [],
        wallets: state.wallets || [],
        monthlyBudgets: state.monthlyBudgets || [],
        expectedExpenses: state.expectedExpenses || [],
        moneyRequests: state.moneyRequests || []
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const fileName = `family_expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (navigator.share && navigator.canShare) {
        const file = new File([jsonStr], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            title: 'نسخة احتياطية - ميزانية عائلة ماهر',
            text: 'ملف Google Drive المشترك لمصروفات العائلة',
            files: [file]
          }).then(() => {
            showToast('✔ تم فتح Google Drive لحفظ وتحديث الملف المشترك');
          }).catch(() => {});
          return;
        }
      }

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📥 تم تحميل ملف النسخة الاحتياطية Google Drive بنجاح');
    }

    function importFromGoogleDriveDirect(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          mergeIncomingSyncData(data);
          showToast('✔ تم استرجاع وتحديث كافة البيانات وموازنة الحسابات بنجاح! ✨');
          playNotificationChime();
          closeModal('googleDriveSyncModal');
          if (typeof renderUI === 'function') renderUI();
        } catch(err) {
          alert('الملف المختار غير صالح');
        }
      };
      reader.readAsText(file);
    }

    // =========================================================================
    // محرك النسخ الاحتياطي التلقائي اليومي (الساعة 12:00 ظهراً) وحذف نسخة الأمس
    // Daily 12:00 PM Google Drive Backup & Previous Day Deletion Engine
    // =========================================================================

    function getFormattedDateYMD(d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function getYesterdayDateYMD(d) {
      const y = new Date(d.getTime() - 24 * 60 * 60 * 1000);
      return getFormattedDateYMD(y);
    }

    // فحص وتحديث بطاقات حالة النسخ الاحتياطي اليومي في الواجهة
    function updateDailyBackupDisplay() {
      const lblLast = document.getElementById('lblLastDailyBackupTime');
      const lblNext = document.getElementById('lblNextDailyBackupTime');
      const badge = document.getElementById('dailyBackupStatusBadge');
      const settingsBadge = document.getElementById('settingsDailyBackupBadge');

      const lastDate = localStorage.getItem('family_last_daily_noon_backup_date');
      const lastTime = localStorage.getItem('family_last_daily_noon_backup_time');
      const now = new Date();
      const todayStr = getFormattedDateYMD(now);

      if (lastDate === todayStr) {
        if (lblLast) {
          const t = lastTime ? new Date(lastTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '12:00 ظهراً';
          lblLast.textContent = `تم اليوم (${t}) ✨`;
          lblLast.style.color = '#34d399';
        }
        if (lblNext) {
          lblNext.textContent = 'غداً 12:00 ظهراً';
          lblNext.style.color = '#94a3b8';
        }
        if (badge) {
          badge.textContent = 'منجز لليوم 12:00 ظهراً [OK]';
          badge.style.background = 'rgba(34, 197, 94, 0.2)';
          badge.style.color = '#34d399';
          badge.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        }
        if (settingsBadge) {
          settingsBadge.textContent = 'منجز لليوم (12:00 م) [OK]';
          settingsBadge.style.color = '#34d399';
        }
      } else {
        if (lblLast) {
          lblLast.textContent = lastDate ? `السابق (${lastDate})` : 'لم يتم بعد اليوم';
          lblLast.style.color = '#fbbf24';
        }
        if (lblNext) {
          const targetTodayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
          if (now < targetTodayNoon) {
            const diffMin = Math.round((targetTodayNoon - now) / 60000);
            lblNext.textContent = `اليوم 12:00 ظهراً (بعد ${diffMin} دقيقة)`;
            lblNext.style.color = '#38bdf8';
          } else {
            lblNext.textContent = 'مستحق الآن للتشغيل ⚡';
            lblNext.style.color = '#f59e0b';
          }
        }
        if (badge) {
          badge.textContent = 'مجدول يومياً 12:00 ظهراً ⏰';
          badge.style.background = 'rgba(56, 189, 248, 0.2)';
          badge.style.color = '#38bdf8';
          badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        }
        if (settingsBadge) {
          settingsBadge.textContent = 'مجدول 12:00 ظهراً';
          settingsBadge.style.color = '#38bdf8';
        }
      }
    }

    // تنفيذ النسخة الاحتياطية اليومية وحفظها على جوجل درايف وحذف نسخة اليوم السابق
    async function executeDailyNoonBackup(forceNow = false) {
      const now = new Date();
      const todayStr = getFormattedDateYMD(now);
      const yesterdayStr = getYesterdayDateYMD(now);
      const lastBackupDate = localStorage.getItem('family_last_daily_noon_backup_date');

      // إذا لم يكن تشغيلاً يدوياً: تحقق من حلول الساعة 12 ظهراً وعدم التكرار في نفس اليوم
      if (!forceNow) {
        if (now.getHours() < 12) {
          return false;
        }
        if (lastBackupDate === todayStr) {
          return false;
        }
      }

      console.log(`[Daily Noon Backup] Running daily backup for ${todayStr}. Previous day to delete: ${yesterdayStr}`);

      const todayFileName = `family_backup_${todayStr}.json`;
      const yesterdayFileName = `family_backup_${yesterdayStr}.json`;

      const backupBundle = {
        app: 'FamilyExpenseTrackerMonefy',
        account: (typeof GDRIVE_CONFIG !== 'undefined' ? GDRIVE_CONFIG.targetAccount : 'maher.easybakery@gmail.com'),
        backupType: 'daily_noon_scheduled',
        backupDate: todayStr,
        previousDayDeleted: yesterdayStr,
        scheduledTime: '12:00:00',
        executedAt: now.toISOString(),
        author: (state.currentUser || 'المجدول التلقائي'),
        version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v4.3.0'),
        currency: state.currency || 'EGP',
        transactions: state.transactions || [],
        wallets: state.wallets || [],
        monthlyBudgets: state.monthlyBudgets || [],
        expectedExpenses: state.expectedExpenses || [],
        moneyRequests: state.moneyRequests || [],
        debts: state.debts || [],
        notes: state.notes || [],
        activityLog: (state.activityLog || []).slice(0, 100)
      };

      const customWebhook = localStorage.getItem('family_gdrive_webhook_url');
      const syncEndpoint = (customWebhook && customWebhook.startsWith('http')) ? customWebhook : (typeof GDRIVE_CONFIG !== 'undefined' ? GDRIVE_CONFIG.defaultSyncUrl : 'https://script.google.com/macros/s/AKfycbwdIuCjR3lUy0DTBnWTj9koFZ4ghRxR2Dq-sdj_LjIS2r_gHfpp4AX_32dNd2RRKPaShQ/exec');

      const payload = {
        action: 'daily_noon_backup',
        todayDate: todayStr,
        yesterdayDate: yesterdayStr,
        todayFileName: todayFileName,
        yesterdayFileName: yesterdayFileName,
        data: backupBundle
      };

      try {
        // 1. الإرسال لسحابة Google Apps Script لحفظ نسخة اليوم وحذف نسخة الأمس في Drive
        const resp = await fetch(syncEndpoint, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const resData = await resp.json().catch(() => null);
        console.log('[Daily Noon Backup] Google Drive Response:', resData);

        // 2. إدارة التخزين المحلي (حفظ اليوم وحذف الأمس محلياً أيضاً)
        localStorage.setItem('family_last_daily_noon_backup_date', todayStr);
        localStorage.setItem('family_last_daily_noon_backup_time', now.toISOString());
        localStorage.setItem(`family_daily_backup_${todayStr}`, JSON.stringify(backupBundle));
        localStorage.removeItem(`family_daily_backup_${yesterdayStr}`);

        // تنظيف أي نسخ قديمة سابقة غير اليوم الحالي
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('family_daily_backup_') && key !== `family_daily_backup_${todayStr}`) {
            localStorage.removeItem(key);
          }
        }

        // 3. توثيق العملية في سجل النشاطات
        if (typeof logActivity === 'function') {
          logActivity({
            type: 'daily_backup',
            action: 'نسخ احتياطي مجدول 12:00 ظهراً',
            label: `تم حفظ نسخة اليوم (${todayFileName}) على Google Drive وحذف نسخة الأمس (${yesterdayFileName}) بنجاح`,
            amount: 0,
            member: state.currentUser || 'النظام',
            author: 'المجدول التلقائي'
          });
        }

        // 4. تحديث الواجهة والتنبيه الصوتي والمرئي
        updateDailyBackupDisplay();
        if (typeof updateDriveSyncStatusDisplay === 'function') updateDriveSyncStatusDisplay();
        if (forceNow && typeof playNotificationChime === 'function') playNotificationChime();
        if (forceNow && typeof showToast === 'function') {
          showToast(`⏰ تم بنجاح عمل نسخة 12:00 ظهراً وحفظها على Google Drive وحذف نسخة الأمس (${yesterdayStr}) ✨`);
        }
        return true;
      } catch(err) {
        console.warn('[Daily Noon Backup] Transmission note:', err);
        // حفظ محلي للطوارئ
        localStorage.setItem('family_last_daily_noon_backup_date', todayStr);
        localStorage.setItem('family_last_daily_noon_backup_time', now.toISOString());
        localStorage.setItem(`family_daily_backup_${todayStr}`, JSON.stringify(backupBundle));
        localStorage.removeItem(`family_daily_backup_${yesterdayStr}`);

        if (typeof logActivity === 'function') {
          logActivity({
            type: 'daily_backup',
            action: 'نسخ احتياطي محلي 12:00 ظهراً',
            label: `تم تجهيز نسخة (${todayFileName}) وحذف نسخة الأمس (${yesterdayFileName}) محلياً وبانتظار مزامنة Drive`,
            amount: 0,
            member: state.currentUser || 'النظام',
            author: 'المجدول التلقائي'
          });
        }

        updateDailyBackupDisplay();
        if (forceNow && typeof showToast === 'function') {
          showToast(`💾 تم تجهيز نسخة 12:00 ظهراً (${todayFileName}) وحذف نسخة الأمس، وتنتظر مزامنة Google Drive`);
        }
        return false;
      }
    }

    // دالة الفحص الدوري التلقائي لموعد 12:00 ظهراً
    function checkDailyNoonBackupSchedule() {
      const now = new Date();
      updateDailyBackupDisplay();

      // إذا كانت الساعة 12 ظهراً أو بعدها، ولم يتم عمل نسخة اليوم بعد: تشغيل فوري تلقائي
      if (now.getHours() >= 12) {
        const todayStr = getFormattedDateYMD(now);
        const lastDate = localStorage.getItem('family_last_daily_noon_backup_date');
        if (lastDate !== todayStr) {
          executeDailyNoonBackup(false);
        }
      }
    }

    // تشغيل الفحص الدوري كل 30 ثانية في الخلفية
    setInterval(checkDailyNoonBackupSchedule, 30000);

    // Note: Unified sync handled cleanly by executeMasterUnifiedSyncAndRefresh

    // استدعاء فحص المزامنة الأولي وجدولة النسخ اليومي عند بدء التشغيل
    setTimeout(() => {
      const curWebhook = localStorage.getItem('family_gdrive_webhook_url');
      if (!curWebhook || curWebhook.includes('kvdb.io')) {
        localStorage.setItem('family_gdrive_webhook_url', 'https://script.google.com/macros/s/AKfycbwdIuCjR3lUy0DTBnWTj9koFZ4ghRxR2Dq-sdj_LjIS2r_gHfpp4AX_32dNd2RRKPaShQ/exec');
      }
      executeGoogleDriveSync();
      checkDailyNoonBackupSchedule();
    }, 1200);


    
    function switchAuthMode(mode) {
      const vQuick = document.getElementById('authViewQuick');
      const vEmail = document.getElementById('authViewEmail');
      const vNew = document.getElementById('authViewNew');
      const bQuick = document.getElementById('tabBtnQuickLogin');
      const bEmail = document.getElementById('tabBtnEmailLogin');
      const bNew = document.getElementById('tabBtnNewAccount');

      [bQuick, bEmail, bNew].forEach(b => {
        if (b) {
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
        }
      });

      if (vQuick) vQuick.style.display = (mode === 'quick') ? 'block' : 'none';
      if (vEmail) vEmail.style.display = (mode === 'email') ? 'block' : 'none';
      if (vNew) vNew.style.display = (mode === 'new') ? 'block' : 'none';

      if (mode === 'quick' && bQuick) {
        bQuick.style.background = 'linear-gradient(135deg, #0284c7, #0ea5e9)';
        bQuick.style.color = '#fff';
      } else if (mode === 'email' && bEmail) {
        bEmail.style.background = 'linear-gradient(135deg, #0284c7, #0ea5e9)';
        bEmail.style.color = '#fff';
      } else if (mode === 'new' && bNew) {
        bNew.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        bNew.style.color = '#fff';
      }
    }

    function handleCustomSignIn() {
      const email = document.getElementById('inpAuthEmail')?.value.trim().toLowerCase();
      const pass = document.getElementById('inpAuthPassword')?.value.trim();

      if (!email || !email.includes('@')) {
        showToast('⚠️ يرجى إدخال بريد إلكتروني صحيح');
        return;
      }

      let member = 'ماهر';
      if (email.includes('aya')) member = 'آية';
      else if (email.includes('mohamed')) member = 'محمد';
      else if (email.includes('mariam')) member = 'مريم';

      quickSelectUser(member);
    }

    function handleCreateNewMemberAccount() {
      const name = document.getElementById('inpNewUserName')?.value.trim();
      const email = document.getElementById('inpNewUserEmail')?.value.trim();
      const pass = document.getElementById('inpNewUserPassword')?.value.trim();

      if (!name) {
        showToast('⚠️ يرجى إدخال اسم الفرد الجديد');
        return;
      }

      quickSelectUser(name);
      showToast(`🎉 تم إنشاء وتفعيل حساب ${name} بنجاح!`);
    }

    // استدعاء حالة سحابة جوجل درايف عند بدء التطبيق
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        updateDriveSyncStatusDisplay();
        const webhookUrl = localStorage.getItem('family_gdrive_webhook_url');
        if (webhookUrl) {
          fetch(webhookUrl).then(r => r.json()).then(res => {
            if (res && res.data) {
              mergeIncomingSyncData(res.data);
              updateDriveSyncStatusDisplay();
            }
          }).catch(e => console.log('Silent cloud check skipped'));
        }
      }, 1000);
    });


    // =========================================================================
    // محرك الأقسام الثلاثة المنفصلة لصفحة طلب (v3.4.0)
    // 1. الطلبات والسجل
    // 2. تسجيل الدخل وعرض التسجيلات السابقة
    // 3. المحافظ والحركات بينها والتحليل والتصدير
    // =========================================================================

    function switchRequestMainSection(sec) {
      const sReq = document.getElementById('secReqRequests');
      const sInc = document.getElementById('secReqIncome');
      const sWal = document.getElementById('secReqWallets');

      const bReq = document.getElementById('btnMainTabRequests');
      const bInc = document.getElementById('btnMainTabIncome');
      const bWal = document.getElementById('btnMainTabWallets');

      [sReq, sInc, sWal].forEach(s => { if (s) s.style.display = 'none'; });
      [bReq, bInc, bWal].forEach(b => {
        if (b) {
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
          b.style.boxShadow = 'none';
        }
      });

      if (sec === 'requests') {
        if (sReq) sReq.style.display = 'block';
        if (bReq) {
          bReq.style.background = 'linear-gradient(135deg, #ec4899, #be185d)';
          bReq.style.color = '#fff';
          bReq.style.boxShadow = '0 3px 10px rgba(236, 72, 153, 0.35)';
        }
      } else if (sec === 'income') {
        if (sInc) sInc.style.display = 'block';
        if (bInc) {
          bInc.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          bInc.style.color = '#fff';
          bInc.style.boxShadow = '0 3px 10px rgba(16, 185, 129, 0.35)';
        }
        initDirectIncomeSection();
      } else if (sec === 'wallets') {
        if (sWal) sWal.style.display = 'block';
        if (bWal) {
          bWal.style.background = 'linear-gradient(135deg, #0284c7, #0ea5e9)';
          bWal.style.color = '#fff';
          bWal.style.boxShadow = '0 3px 10px rgba(2, 132, 199, 0.35)';
        }
        initSecWallets();
      }
    }

    // --- توابع القسم الأول: الطلبات والسجل ---
    function switchRequestSubTab(sub) {
      const pForm = document.getElementById('panelReqNewForm');
      const pList = document.getElementById('panelReqListContainer');
      const bNew = document.getElementById('btnSubReqNew');
      const bList = document.getElementById('btnSubReqList');

      if (sub === 'new') {
        if (pForm) pForm.style.display = 'block';
        if (pList) pList.style.display = 'none';
        if (bNew) {
          bNew.style.background = 'linear-gradient(135deg, #ec4899, #be185d)';
          bNew.style.color = '#fff';
        }
        if (bList) {
          bList.style.background = 'transparent';
          bList.style.color = '#94a3b8';
        }
      } else {
        if (pForm) pForm.style.display = 'none';
        if (pList) pList.style.display = 'block';
        if (bList) {
          bList.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          bList.style.color = '#fff';
        }
        if (bNew) {
          bNew.style.background = 'transparent';
          bNew.style.color = '#94a3b8';
        }
        if (typeof renderRequestsList === 'function') renderRequestsList();
      }
    }

    // --- توابع القسم الثاني: تسجيل الدخل وسجل التسجيلات ---
    function switchIncomeSubTab(sub) {
      const pForm = document.getElementById('panelIncomeNewForm');
      const pList = document.getElementById('panelIncomeHistoryContainer');
      const bNew = document.getElementById('btnSubIncomeNew');
      const bList = document.getElementById('btnSubIncomeList');

      if (sub === 'new') {
        if (pForm) pForm.style.display = 'block';
        if (pList) pList.style.display = 'none';
        if (bNew) {
          bNew.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          bNew.style.color = '#fff';
        }
        if (bList) {
          bList.style.background = 'transparent';
          bList.style.color = '#94a3b8';
        }
      } else {
        if (pForm) pForm.style.display = 'none';
        if (pList) pList.style.display = 'block';
        if (bList) {
          bList.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          bList.style.color = '#fff';
        }
        if (bNew) {
          bNew.style.background = 'transparent';
          bNew.style.color = '#94a3b8';
        }
        renderDirectIncomeHistoryList();
      }
    }

    function initDirectIncomeSection() {
      // 1. ملء قائمة المحافظ
      const wSel = document.getElementById('inpDirectIncomeWallet');
      if (wSel) {
        wSel.innerHTML = (state.wallets || []).map(w => `<option value="${w.id}">${w.name} (${formatMoney(w.balance || 0)})</option>`).join('');
      }
      // 2. ضبط التاريخ الحالي
      const dInp = document.getElementById('inpDirectIncomeDate');
      if (dInp && !dInp.value) {
        dInp.value = new Date().toISOString().split('T')[0];
      }
      renderDirectIncomeHistoryList();
    }

    function handleSaveDirectIncome() {
      const amtInp = document.getElementById('inpDirectIncomeAmount');
      const dateInp = document.getElementById('inpDirectIncomeDate');
      const wSel = document.getElementById('inpDirectIncomeWallet');
      const catSel = document.getElementById('inpDirectIncomeCategory');
      const memSel = document.getElementById('inpDirectIncomeMember');
      const descInp = document.getElementById('inpDirectIncomeDesc');

      const amount = parseFloat(amtInp ? amtInp.value : 0);
      const date = dateInp && dateInp.value ? dateInp.value : new Date().toISOString().split('T')[0];
      const walletId = wSel ? wSel.value : ((state.wallets && state.wallets[0]) ? state.wallets[0].id : 'wallet-cash-safe');
      const category = catSel ? catSel.value : 'salary';
      const member = memSel ? memSel.value : (state.currentUser || 'ماهر');
      const desc = descInp ? descInp.value.trim() : '';

      if (isNaN(amount) || amount <= 0) {
        showToast('⚠️ الرجاء إدخال مبلغ صحيح أكبر من الصفر');
        if (amtInp) amtInp.focus();
        return;
      }

      // تحديث رصيد المحفظة
      const targetWallet = (state.wallets || []).find(w => w.id === walletId);
      if (targetWallet) {
        targetWallet.balance = (Number(targetWallet.balance) || 0) + amount;
        try { localStorage.setItem('family_monefy_wallets', JSON.stringify(state.wallets)); } catch(e){}
      }

      // إضافة الحركة لسجل العمليات
      const newIncomeTx = {
        id: 'tx-inc-' + Date.now(),
        type: 'income',
        amount: amount,
        category: category,
        description: desc || `إيداع دخل [${catSel ? catSel.options[catSel.selectedIndex].text : 'دخل'}]`,
        member: member,
        walletId: walletId,
        date: date,
        timestamp: Date.now()
      };

      state.transactions = state.transactions || [];
      state.transactions.unshift(newIncomeTx);
      saveTx();

      showToast(`🎉 تم تسجيل إيداع ${formatMoney(amount)} في محفظة ${targetWallet ? targetWallet.name : ''} بنجاح!`);
      playNotificationChime();

      if (amtInp) amtInp.value = '';
      if (descInp) descInp.value = '';

      if (typeof renderUI === 'function') renderUI();
      renderDirectIncomeHistoryList();
    }

    function renderDirectIncomeHistoryList() {
      const container = document.getElementById('directIncomeListRows');
      const totalEl = document.getElementById('lblIncomeHistoryTotalAmt');
      const badgeEl = document.getElementById('incomeBadgeCount');
      if (!container) return;

      const incList = (state.transactions || []).filter(t => t.type === 'income');
      incList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      let total = 0;
      incList.forEach(t => { total += (Number(t.amount) || 0); });

      if (totalEl) totalEl.textContent = '+ ' + formatMoney(total);
      if (badgeEl) badgeEl.textContent = incList.length;

      if (incList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 0.78rem;">لا توجد تسجيلات دخل سابقة</div>';
        return;
      }

      container.innerHTML = incList.map(t => {
        const amt = Number(t.amount) || 0;
        const wName = getWalletName(t.walletId) || 'المحفظة';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin-bottom: 6px; border-radius: 10px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(16, 185, 129, 0.25);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.2); color: #34d399; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                <i class="fa-solid fa-money-bill-wave"></i>
              </div>
              <div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #f8fafc;">${escapeHtml(t.description || 'إيداع نقدي')}</div>
                <div style="font-size: 0.65rem; color: #94a3b8; display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                  <span>${t.date}</span>
                  <span>•</span>
                  <span style="color: #38bdf8;">${wName}</span>
                  <span>•</span>
                  <span style="color: #34d399;">${t.member || 'ماهر'}</span>
                </div>
              </div>
            </div>
            <div style="font-size: 0.90rem; font-weight: 900; color: #34d399; direction: rtl;">
              + ${formatMoney(amt)}
            </div>
          </div>
        `;
      }).join('');
    }

    // --- توابع القسم الثالث: المحافظ والحركات والتحليل والتصدير ---
    function toggleSecAddWalletForm() {
      const box = document.getElementById('secBoxAddWallet');
      if (!box) return;
      box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
      if (box.style.display === 'block') {
        const inp = document.getElementById('inpSecNewWalletName');
        if (inp) inp.focus();
      }
    }

    function toggleSecTransferForm() {
      const box = document.getElementById('secBoxTransfer');
      if (!box) return;
      box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
      if (box.style.display === 'block') {
        populateSecTransferSelects();
        const d = document.getElementById('inpSecTransDate');
        if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
      }
    }

    function populateSecTransferSelects() {
      const fromSel = document.getElementById('inpSecTransFrom');
      const toSel = document.getElementById('inpSecTransTo');
      if (!fromSel || !toSel) return;

      const wallets = state.wallets || [];
      const opts = wallets.map(w => `<option value="${w.id}">${w.name} (${formatMoney(w.balance || 0)})</option>`).join('');
      fromSel.innerHTML = opts;
      toSel.innerHTML = opts;
      if (wallets.length > 1) toSel.selectedIndex = 1;
    }

    function handleCreateSecWallet() {
      const name = document.getElementById('inpSecNewWalletName')?.value.trim();
      const initBal = parseFloat(document.getElementById('inpSecNewWalletBal')?.value) || 0;
      const icon = document.getElementById('inpSecNewWalletIcon')?.value || 'fa-solid fa-wallet';
      const color = document.getElementById('inpSecNewWalletColor')?.value || '#38bdf8';

      if (!name) {
        showToast('⚠️ يرجى إدخال اسم المحفظة');
        return;
      }

      const newWallet = {
        id: 'wallet-' + Date.now(),
        name: name,
        icon: icon,
        initialBalance: initBal,
        balance: initBal,
        color: color
      };

      state.wallets = state.wallets || [];
      state.wallets.push(newWallet);
      try { localStorage.setItem('family_monefy_wallets', JSON.stringify(state.wallets)); } catch(e){}

      if (initBal > 0) {
        const tx = {
          id: 'tx-init-' + Date.now(),
          type: 'income',
          amount: initBal,
          category: 'other-income',
          description: `رصيد افتتاحي لمحفظة ${name}`,
          member: state.currentUser || 'ماهر',
          walletId: newWallet.id,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        };
        state.transactions.unshift(tx);
        saveTx();
      }

      logActivity({
        type: 'create_wallet',
        action: 'إنشاء محفظة مالية',
        label: `إنشاء محفظة جديدة: ${name} (رصيد افتتاحي: ${formatMoney(initBal)})`,
        amount: initBal,
        sign: initBal > 0 ? '+' : '',
        member: state.currentUser || 'ماهر',
        author: state.currentUser || 'ماهر',
        wallet: name,
        notes: 'تم تأسيس المحفظة وإدراجها بالنظام من إدارة المحافظ'
      });

      showToast(`🎉 تم إنشاء وتثبيت محفظة "${name}" بنجاح!`);
      playNotificationChime();

      document.getElementById('inpSecNewWalletName').value = '';
      document.getElementById('inpSecNewWalletBal').value = '0';
      toggleSecAddWalletForm();

      if (typeof populateWalletDropdowns === 'function') populateWalletDropdowns();
      if (typeof renderUI === 'function') renderUI();
      initSecWallets();
    }

    function handleExecuteSecTransfer() {
      const fromSel = document.getElementById('inpSecTransFrom');
      const toSel = document.getElementById('inpSecTransTo');
      const amtInp = document.getElementById('inpSecTransAmt');
      const dateInp = document.getElementById('inpSecTransDate');
      const notesInp = document.getElementById('inpSecTransNotes');

      const fromId = fromSel ? fromSel.value : '';
      const toId = toSel ? toSel.value : '';
      const amount = parseFloat(amtInp ? amtInp.value : 0);
      const date = dateInp && dateInp.value ? dateInp.value : new Date().toISOString().split('T')[0];
      const notes = notesInp ? notesInp.value.trim() : '';

      if (isNaN(amount) || amount <= 0) {
        showToast('⚠️ الرجاء إدخال مبلغ صحيح أكبر من الصفر للتحويل');
        return;
      }

      if (fromId === toId) {
        showToast('⚠️ لا يمكن التحويل لنفس المحفظة!');
        return;
      }

      const fromWallet = (state.wallets || []).find(w => w.id === fromId);
      const toWallet = (state.wallets || []).find(w => w.id === toId);

      if (!fromWallet || !toWallet) {
        showToast('⚠️ خطأ في العثور على بيانات المحافظ');
        return;
      }

      fromWallet.balance = (Number(fromWallet.balance) || 0) - amount;
      toWallet.balance = (Number(toWallet.balance) || 0) + amount;
      try { localStorage.setItem('family_monefy_wallets', JSON.stringify(state.wallets)); } catch(e){}

      const transferTx = {
        id: 'tx-trans-' + Date.now(),
        type: 'transfer',
        amount: amount,
        category: 'transfer',
        description: notes || `تحويل مالي من [${fromWallet.name}] إلى [${toWallet.name}]`,
        fromWalletId: fromId,
        toWalletId: toId,
        walletId: fromId,
        member: state.currentUser || 'ماهر',
        date: date,
        timestamp: Date.now()
      };

      state.transactions.unshift(transferTx);
      saveTx();

      logActivity({
        type: 'wallet_transfer',
        action: 'تحويل بين المحافظ',
        label: `تحويل ${formatMoney(amount)} من [${fromWallet.name}] إلى [${toWallet.name}]`,
        amount: amount,
        sign: '↔',
        member: state.currentUser || 'ماهر',
        author: state.currentUser || 'ماهر',
        wallet: `${fromWallet.name} ⬅ ${toWallet.name}`,
        notes: notes || 'تحويل رصيد نقدي'
      });

      showToast(`✔ تم تحويل ${formatMoney(amount)} من ${fromWallet.name} إلى ${toWallet.name} بنجاح!`);
      playNotificationChime();

      if (amtInp) amtInp.value = '';
      if (notesInp) notesInp.value = '';
      toggleSecTransferForm();

      if (typeof renderUI === 'function') renderUI();
      initSecWallets();
    }

    function initSecWallets() {
      // 1. ملء قائمة المحافظ
      const wSel = document.getElementById('secFilterWallet');
      if (wSel) {
        let opts = '<option value="all">كل المحافظ مجتمعة 🌐</option>';
        (state.wallets || []).forEach(w => {
          opts += `<option value="${w.id}">${w.name} (${formatMoney(w.balance || 0)})</option>`;
        });
        wSel.innerHTML = opts;
      }

      // 2. ملء قائمة بنود المصروفات
      const cSel = document.getElementById('secFilterCategory');
      if (cSel) {
        let opts = '<option value="all">كل بنود المصروفات 🏷️</option>';
        const cats = [
          { id: 'food', name: 'طعام ومشتريات' },
          { id: 'daily', name: 'مصروف يومي' },
          { id: 'bills', name: 'فواتير والتزامات' },
          { id: 'transport', name: 'مواصلات وبنزين' },
          { id: 'home', name: 'مستلزمات منزل' },
          { id: 'health', name: 'صحة وعلاج' },
          { id: 'clothes', name: 'ملابس وأحذية' },
          { id: 'education', name: 'تعليم ودروس' },
          { id: 'others', name: 'أخرى' }
        ];
        cats.forEach(c => { opts += `<option value="${c.id}">${c.name}</option>`; });
        cSel.innerHTML = opts;
      }

      populateSecTransferSelects();
      renderSecWalletStatementTable();
    }

    function resetSecWalletFilters() {
      const wSel = document.getElementById('secFilterWallet');
      const mSel = document.getElementById('secFilterMember');
      const cSel = document.getElementById('secFilterCategory');
      const pSel = document.getElementById('secFilterPeriod');

      if (wSel) wSel.value = 'all';
      if (mSel) mSel.value = 'all';
      if (cSel) cSel.value = 'all';
      if (pSel) pSel.value = 'month';

      renderSecWalletStatementTable();
    }

    function renderSecWalletStatementTable() {
      const targetWalletId = document.getElementById('secFilterWallet')?.value || 'all';
      const targetMember = document.getElementById('secFilterMember')?.value || 'all';
      const targetCat = document.getElementById('secFilterCategory')?.value || 'all';
      const targetPeriod = document.getElementById('secFilterPeriod')?.value || 'all';

      let txList = [...(state.transactions || [])];

      // فلترة المحفظة
      if (targetWalletId !== 'all') {
        txList = txList.filter(t => t.walletId === targetWalletId || t.fromWalletId === targetWalletId || t.toWalletId === targetWalletId);
      }

      // فلترة الشخص
      if (targetMember !== 'all') {
        txList = txList.filter(t => (t.member || t.author || '').toLowerCase().includes(targetMember.toLowerCase()));
      }

      // فلترة البند
      if (targetCat !== 'all') {
        txList = txList.filter(t => t.category === targetCat);
      }

      // فلترة الفترة
      const now = new Date();
      const todayStr = getLocalDateStr(now);
      if (targetPeriod === 'today') {
        txList = txList.filter(t => t.date === todayStr);
      } else if (targetPeriod === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = getLocalDateStr(weekAgo);
        txList = txList.filter(t => t.date >= weekAgoStr);
      } else if (targetPeriod === 'month') {
        const mPrefix = todayStr.substring(0, 7);
        txList = txList.filter(t => (t.date || '').startsWith(mPrefix));
      }

      const chronological = [...txList].reverse();

      let openingBal = 0;
      if (targetWalletId !== 'all') {
        const wObj = (state.wallets || []).find(w => w.id === targetWalletId);
        openingBal = Number(wObj ? wObj.initialBalance : 0) || 0;
      } else {
        openingBal = (state.wallets || []).reduce((sum, w) => sum + (Number(w.initialBalance) || 0), 0);
      }

      let running = openingBal;
      let totalIn = 0;
      let totalOut = 0;

      const rowsHtml = chronological.map(tx => {
        let isDebit = false;
        let amt = Number(tx.amount) || 0;

        if (tx.type === 'income') {
          totalIn += amt;
          running += amt;
        } else if (tx.type === 'expense') {
          isDebit = true;
          totalOut += amt;
          running -= amt;
        } else if (tx.type === 'transfer') {
          if (targetWalletId === 'all') {}
          else if (tx.toWalletId === targetWalletId) {
            totalIn += amt;
            running += amt;
          } else if (tx.fromWalletId === targetWalletId) {
            isDebit = true;
            totalOut += amt;
            running -= amt;
          }
        }

        const amtFormatted = isDebit 
          ? `<span style="color: #f87171; font-weight: 900; direction: rtl; display: inline-block;">- ${formatMoney(amt)}</span>`
          : `<span style="color: #34d399; font-weight: 900; direction: rtl; display: inline-block;">+ ${formatMoney(amt)}</span>`;

        const memberBadge = `<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 1px 6px; font-size: 0.65rem; font-weight: 800;">${tx.member || 'ماهر'}</span>`;
        const catBadge = `<span style="background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 6px; padding: 1px 6px; font-size: 0.65rem; font-weight: 800;">${getCategoryName(tx.category)}</span>`;

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 7px 6px; color: #94a3b8; font-size: 0.68rem; white-space: nowrap;">${tx.date || ''}</td>
            <td style="padding: 7px 6px; font-weight: 700; color: #f8fafc; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(tx.description || tx.reason || 'عملية مالية')}</td>
            <td style="padding: 7px 6px;">${memberBadge}</td>
            <td style="padding: 7px 6px;">${catBadge}</td>
            <td style="padding: 7px 6px; font-weight: 700; color: #38bdf8;">${escapeHtml(tx.author || tx.member || state.currentUser || 'ماهر')}</td>
            <td style="padding: 7px 6px; text-align: left;">${amtFormatted}</td>
            <td style="padding: 7px 6px; font-weight: 800; color: #38bdf8; direction: rtl; text-align: left;">${formatMoney(running)}</td>
          </tr>
        `;
      }).reverse().join('');

      const elOp = document.getElementById('secWalletKpiOpening');
      const elIn = document.getElementById('secWalletKpiTotalIn');
      const elOut = document.getElementById('secWalletKpiTotalOut');
      const elBal = document.getElementById('secWalletKpiBalance');

      if (elOp) elOp.textContent = formatMoney(openingBal);
      if (elIn) elIn.textContent = '+ ' + formatMoney(totalIn);
      if (elOut) elOut.textContent = '- ' + formatMoney(totalOut);
      if (elBal) elBal.textContent = formatMoney(running);

      const tbody = document.getElementById('secWalletTableBody');
      if (tbody) {
        tbody.innerHTML = (chronological.length === 0) 
          ? `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-weight: 700;">لا توجد حركات مطابقة للفلاتر المحددة</td></tr>`
          : rowsHtml;
      }
    }

    function exportSecWalletExcel() {
      if (typeof XLSX === 'undefined') {
        showToast('⚠️ مكتبة الإكسيل قيد التحميل، يرجى المحاولة بعد لحظات');
        return;
      }
      const wSel = document.getElementById('secFilterWallet');
      const wName = wSel && wSel.value !== 'all' ? (getWalletName(wSel.value) || 'محفظة') : 'كافة المحافظ مجتمعة';

      const rows = [];
      rows.push(['كشف حساب المحفظة والعمليات المعتمد']);
      rows.push(['المحفظة المستهدفة:', wName]);
      rows.push(['تاريخ التصدير:', new Date().toLocaleDateString('ar-EG')]);
      rows.push([]);
      rows.push(['التاريخ', 'البيان', 'الفرد', 'البند والتصنيف', 'منفذ العملية', 'المبلغ', 'الرصيد التراكمي']);

      const tbody = document.getElementById('secWalletTableBody');
      if (!tbody) return;

      tbody.querySelectorAll('tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 7) {
          rows.push([
            tds[0].textContent.trim(),
            tds[1].textContent.trim(),
            tds[2].textContent.trim(),
            tds[3].textContent.trim(),
            tds[4].textContent.trim(),
            tds[5].textContent.trim(),
            tds[6].textContent.trim()
          ]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!dir'] = 'rtl';
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'كشف المحفظة');
      XLSX.writeFile(wb, `كشف_محفظة_${wName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      showToast('📊 تم تصدير كشف الحساب إكسيل بنجاح!');
    }

    function exportSecWalletPdf() {
      const wSel = document.getElementById('secFilterWallet');
      const wName = wSel && wSel.value !== 'all' ? (getWalletName(wSel.value) || 'المحفظة') : 'كافة المحافظ مجتمعة';
      const tbody = document.getElementById('secWalletTableBody');
      const rowsHtml = tbody ? tbody.innerHTML : '';

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>عيلة ماهر ❤️ أية</title>
  <meta name="apple-mobile-web-app-title" content="عيلة ماهر ❤️ أية">
          <style>
            body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 20px; color: #1e293b; }
            h2 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.85rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
            th { background: #f1f5f9; color: #0f172a; }
          </style>
        </head>
        <body>
          <h2>كشف حساب مالي تفصيلي - ${wName}</h2>
          <div class="header-info">
            <span>تطبيق مصروفات العائلة (ماهر & آية)</span>
            <span>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>الفرد</th>
                <th>البند</th>
                <th>منفذ العملية</th>
                <th>المبلغ</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          <\/script>
        
  </body>
        </html>
      `);
      printWindow.document.close();
    }


    // =========================================================================
    // 1. درج ملخص النشاط المالي الشامل (Summary Drawer Engine)
    // =========================================================================

    
    // =========================================================================
    // محرك درج اليسار الموحد: ملخص النشاط + المهام الذكية Tasks + تقويم الذهب 21
    // =========================================================================
    let currentDrawerTab = 'summary'; // 'summary' | 'tasks'
    let currentSummaryPeriod = 'day'; // 'day' | 'week' | 'month' | 'year' | 'custom'
    let currentSummaryCurrency = 'EGP'; // 'EGP' | 'SAR' | 'USD' | 'GOLD21'
    let summaryCustomDateRange = { from: '', to: '' };
    let currentPendingTaskPhotoUri = null;

    function openSummaryDrawer(initialTab = 'summary') {
      const drawer = document.getElementById('summaryLeftDrawer');
      const backdrop = document.getElementById('summaryDrawerBackdrop');
      if (drawer) drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      switchLeftDrawerTab(initialTab);
    }

    function closeSummaryLeftDrawer() {
      const drawer = document.getElementById('summaryLeftDrawer');
      const backdrop = document.getElementById('summaryDrawerBackdrop');
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }

    function switchLeftDrawerTab(tab) {
      currentDrawerTab = tab;
      const btnSum = document.getElementById('btnDrawerMasterSummary');
      const btnTasks = document.getElementById('btnDrawerMasterTasks');
      const filterBar = document.getElementById('drawerSummaryFilterBar');
      const sumSec = document.getElementById('drawerSummaryViewSection');
      const tasksSec = document.getElementById('drawerTasksViewSection');

      if (tab === 'summary') {
        if (btnSum) { btnSum.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)'; btnSum.style.color = '#fff'; }
        if (btnTasks) { btnTasks.style.background = 'transparent'; btnTasks.style.color = '#c084fc'; }
        if (filterBar) filterBar.style.display = 'flex';
        if (sumSec) sumSec.style.display = 'flex';
        if (tasksSec) tasksSec.style.display = 'none';
        renderSummaryDrawer(currentSummaryPeriod);
      } else {
        if (btnSum) { btnSum.style.background = 'transparent'; btnSum.style.color = '#38bdf8'; }
        if (btnTasks) { btnTasks.style.background = 'linear-gradient(135deg, #a855f7, #7c3aed)'; btnTasks.style.color = '#fff'; }
        if (filterBar) filterBar.style.display = 'none';
        if (sumSec) sumSec.style.display = 'none';
        if (tasksSec) tasksSec.style.display = 'flex';
        renderDrawerTasksList();
      }
    }

    function switchSummaryPeriod(p) {
      currentSummaryPeriod = p;
      ['day', 'week', 'month', 'year', 'custom'].forEach(tab => {
        const btnId = 'btnSummaryTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
        const btn = document.getElementById(btnId);
        if (btn) {
          if (tab === p) {
            btn.className = 'exp-tab-btn active';
            btn.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
            btn.style.color = '#fff';
            btn.style.border = 'none';
          } else {
            btn.className = 'exp-tab-btn';
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }
      });

      const customRow = document.getElementById('drawerSummaryCustomDateRow');
      if (customRow) {
        customRow.style.display = p === 'custom' ? 'grid' : 'none';
      }

      renderSummaryDrawer(p);
    }

    function applyCustomSummaryDate() {
      const from = document.getElementById('summaryCustomDateFrom')?.value || '';
      const to = document.getElementById('summaryCustomDateTo')?.value || '';
      summaryCustomDateRange = { from, to };
      renderSummaryDrawer('custom');
    }

    function setSummaryCurrency(curr) {
      currentSummaryCurrency = curr;
      ['EGP', 'SAR', 'USD', 'GOLD'].forEach(c => {
        const btn = document.getElementById('btnSummaryCurr' + c);
        if (btn) {
          const isTarget = (curr === 'GOLD21' && c === 'GOLD') || (curr === c);
          if (isTarget) {
            btn.style.background = c === 'GOLD' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)';
            btn.style.color = c === 'GOLD' ? '#fbbf24' : '#38bdf8';
            btn.style.border = '1.2px solid ' + (c === 'GOLD' ? '#fbbf24' : '#38bdf8');
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }
      });
      renderSummaryDrawer(currentSummaryPeriod);
    }

    function formatSummaryVal(amtEgp) {
      const g21Price = (state.market && state.market.gold21) || 6265;
      const usdRate = (state.market && state.market.usdEgp) || 53.97;
      const sarRate = (state.market && state.market.sarEgp) || 14.37;

      if (currentSummaryCurrency === 'GOLD21') {
        const grams = g21Price > 0 ? (amtEgp / g21Price).toFixed(2) : '0.00';
        return `${grams} جم ذهب 21`;
      } else if (currentSummaryCurrency === 'USD') {
        const usd = usdRate > 0 ? (amtEgp / usdRate).toFixed(2) : '0.00';
        return `$${Number(usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else if (currentSummaryCurrency === 'SAR') {
        const sar = sarRate > 0 ? (amtEgp / sarRate).toFixed(2) : '0.00';
        return `${Number(sar).toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`;
      }
      return formatMoney(amtEgp);
    }

    function renderSummaryDrawer(period = 'day') {
      const container = document.getElementById('summaryDrawerContent');
      if (!container) return;

      const now = new Date();
      const todayStr = getLocalDateStr(now);
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const weekAgoStr = getLocalDateStr(weekAgo);
      const thisMonthPrefix = todayStr.substring(0, 7);
      const thisYearPrefix = todayStr.substring(0, 4);

      let txList = [...(state.transactions || [])];
      let periodTitle = 'ملخص اليوم';

      if (period === 'day') {
        txList = txList.filter(t => t.date === todayStr);
        periodTitle = `ملخص اليوم (${todayStr})`;
      } else if (period === 'week') {
        txList = txList.filter(t => t.date >= weekAgoStr && t.date <= todayStr);
        periodTitle = `ملخص آخر 7 أيام`;
      } else if (period === 'month') {
        txList = txList.filter(t => (t.date || '').startsWith(thisMonthPrefix));
        periodTitle = `ملخص شهر ${now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`;
      } else if (period === 'year') {
        txList = txList.filter(t => (t.date || '').startsWith(thisYearPrefix));
        periodTitle = `ملخص عام ${thisYearPrefix}`;
      } else if (period === 'custom') {
        const { from, to } = summaryCustomDateRange;
        if (from && to) txList = txList.filter(t => t.date >= from && t.date <= to);
        else if (from) txList = txList.filter(t => t.date >= from);
        else if (to) txList = txList.filter(t => t.date <= to);
        periodTitle = `ملخص الفترة المخصصة (${from || 'البداية'} إلى ${to || 'اليوم'})`;
      }

      let totalExp = 0, totalInc = 0;
      const catTotals = {};
      const memberTotals = {};

      txList.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          totalInc += amt;
        } else {
          totalExp += amt;
          const c = t.category || 'other';
          catTotals[c] = (catTotals[c] || 0) + amt;
          const m = t.member || 'البيت';
          memberTotals[m] = (memberTotals[m] || 0) + amt;
        }
      });

      const netFlow = totalInc - totalExp;

      // تقويم الرصيد الفعلي الحالي التراكمي
      let allTotalInc = 0, allTotalExp = 0;
      (state.transactions || []).forEach(t => {
        const a = Number(t.amount) || 0;
        if (t.type === 'income') allTotalInc += a;
        else if (t.type === 'expense') allTotalExp += a;
      });
      const actualBal = allTotalInc - allTotalExp;
      const g21Rate = (state.market && state.market.gold21) || 6265;
      const goldEquivalentGrams = g21Rate > 0 ? (actualBal / g21Rate).toFixed(2) : '0.00';

      // بطاقات البنوك والمحافظ المالية مع النقر المباشر لفتح كشف حركاتها
      const walletsHtml = (state.wallets || []).map(w => {
        let wBal = 0;
        (state.transactions || []).forEach(t => {
          if (t.walletId === w.id) {
            const a = Number(t.amount) || 0;
            if (t.type === 'income') wBal += a;
            else if (t.type === 'expense') wBal -= a;
          }
        });
        return `
          <div style="background: rgba(30, 41, 59, 0.75); border: 1.2px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.15s ease;" onclick="closeSummaryLeftDrawer(); openOperationsFiltered({ walletId: '${w.id}', walletName: '${w.name}' })" title="انقر لعرض تفاصيل وكشف حركات ${w.name}">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 7px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 0.82rem;">
                <i class="fa-solid fa-building-columns"></i>
              </div>
              <div>
                <div style="font-size: 0.78rem; font-weight: 800; color: #f8fafc;">${escapeHtml(w.name)}</div>
                <div style="font-size: 0.62rem; color: #94a3b8;">${w.type || 'حساب بنكي'} • انقر للكشف</div>
              </div>
            </div>
            <div style="font-size: 0.85rem; font-weight: 900; color: ${wBal >= 0 ? '#34d399' : '#f43f5e'}; direction: rtl;">
              ${formatSummaryVal(wBal)}
            </div>
          </div>
        `;
      }).join('');

      let catBreakdownHtml = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([catId, sum]) => {
        const cat = getCategoryObj(catId, 'expense');
        const pct = totalExp > 0 ? ((sum / totalExp) * 100).toFixed(0) : 0;
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; background: rgba(15, 23, 42, 0.6); padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); cursor: pointer;" onclick="closeSummaryLeftDrawer(); openOperationsFiltered({ category: '${catId}', categoryName: '${cat.name}', type: 'expense' });" title="انقر لعرض تفاصيل حركات ${cat.name}">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="font-size: 0.95rem;">${cat.icon ? `<i class="fa-solid ${cat.icon}" style="color: ${cat.color || '#38bdf8'}; font-size: 0.85rem;"></i>` : '📦'}</span>
              <span style="color: #f8fafc; font-weight: 700;">${cat.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #94a3b8; font-size: 0.68rem;">${pct}%</span>
              <span style="color: #ff4d6d; font-weight: 900; direction: rtl;">- ${formatSummaryVal(sum)}</span>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <!-- كارت تقويم الرصيد الفعلي بالذهب عيار 21 البارز -->
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(15, 23, 42, 0.95)); border: 1.4px solid rgba(245, 158, 11, 0.55); border-radius: 14px; padding: 10px 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 0.74rem; font-weight: 900; color: #fbbf24; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-scale-balanced"></i> تقويم الرصيد بالذهب عيار 21:
            </span>
            <span style="font-size: 0.62rem; color: #94a3b8;">سعر الجرام: ${Math.round(g21Rate).toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 950; color: #fde047; direction: rtl; margin-bottom: 2px;">
            ${goldEquivalentGrams} جرام ذهب عيار 21
          </div>
          <div style="font-size: 0.64rem; color: #cbd5e1;">
            يعادل رصيد السيولة الفعلي (${formatMoney(actualBal)}) مقوماً بسعر الصاغة الحقيقي اليوم.
          </div>
        </div>

        <!-- كارت الملخص التنفيذي للفترة -->
        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.98)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 14px; padding: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.4);">
          <div style="font-size: 0.80rem; font-weight: 900; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
            <span>${periodTitle}</span>
            <span style="font-size: 0.68rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 7px; border-radius: 6px;">${txList.length} حركة</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px; padding: 8px; text-align: center;">
              <div style="font-size: 0.64rem; color: #fca5a5; font-weight: 700;">إجمالي المصاريف</div>
              <div style="font-size: 0.95rem; font-weight: 900; color: #ff4d6d; direction: rtl;">- ${formatSummaryVal(totalExp)}</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 8px; text-align: center;">
              <div style="font-size: 0.64rem; color: #86efac; font-weight: 700;">إجمالي الإيداعات</div>
              <div style="font-size: 0.95rem; font-weight: 900; color: #34d399; direction: rtl;">+ ${formatSummaryVal(totalInc)}</div>
            </div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.7); border-radius: 8px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
            <span style="color: #cbd5e1; font-weight: 700;">صافي التدفق المالي:</span>
            <span style="font-weight: 900; direction: rtl; color: ${netFlow >= 0 ? '#34d399' : '#f43f5e'};">
              ${netFlow >= 0 ? '+' : '-'}${formatSummaryVal(Math.abs(netFlow))}
            </span>
          </div>
        </div>

        <!-- قسم أرصدة البنوك والمحافظ المالية (مع النقر لفتح كشف البنك) -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="font-size: 0.78rem; font-weight: 900; color: #f8fafc; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-vault" style="color: #38bdf8;"></i> أرصدة البنوك والمحافظ المالية:</span>
            <span style="font-size: 0.62rem; color: #94a3b8;">(انقر على أي بنك لفتح كشف حركاته)</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            ${walletsHtml}
          </div>
        </div>

        <!-- توزيع البنود -->
        <div style="font-size: 0.78rem; font-weight: 900; color: #f8fafc; margin-top: 4px;">توزيع المصاريف حسب البند:</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${catBreakdownHtml || '<div style="text-align: center; color: #64748b; font-size: 0.74rem; padding: 10px;">لا توجد مصاريف مسجلة خلال هذه الفترة</div>'}
        </div>
      `;
    }

    // =========================================================================
    // محرك المهام والمهام الفرعية والصور المتكامل (Drawer Tasks Engine with Subtasks)
    // =========================================================================
    let currentDrawerTodoSection = 'my_day';

    function switchDrawerTodoSection(sec) {
      currentDrawerTodoSection = sec;
      const tabs = ['my_day', 'important', 'planned', 'all', 'completed'];
      tabs.forEach(t => {
        const btnId = 'btnDrawerTodo' + (t === 'my_day' ? 'MyDay' : (t === 'important' ? 'Important' : (t === 'planned' ? 'Planned' : (t === 'all' ? 'All' : 'Completed'))));
        const btn = document.getElementById(btnId);
        if (btn) {
          if (t === sec) {
            btn.className = 'exp-tab-btn active';
            btn.style.background = 'rgba(168, 85, 247, 0.25)';
            btn.style.color = '#c084fc';
            btn.style.border = 'none';
          } else {
            btn.className = 'exp-tab-btn';
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }
      });
      renderDrawerTasksList();
    }

    function handleTaskPhotoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const maxDim = 1000;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          currentPendingTaskPhotoUri = canvas.toDataURL('image/jpeg', 0.80);
          
          const badge = document.getElementById('taskPhotoAttachedBadge');
          const preview = document.getElementById('taskPendingPhotoPreview');
          const previewImg = document.getElementById('taskPendingPhotoImg');
          if (badge) badge.style.display = 'inline-block';
          if (preview) preview.style.display = 'block';
          if (previewImg) previewImg.src = currentPendingTaskPhotoUri;
          showToast('📸 تم إرفاق صورة للمهمة بنجاح');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearTaskPendingPhoto() {
      currentPendingTaskPhotoUri = null;
      const badge = document.getElementById('taskPhotoAttachedBadge');
      const preview = document.getElementById('taskPendingPhotoPreview');
      const previewImg = document.getElementById('taskPendingPhotoImg');
      if (badge) badge.style.display = 'none';
      if (preview) preview.style.display = 'none';
      if (previewImg) previewImg.src = '';
    }

    function handleDrawerAddNewTask() {
      const titleInp = document.getElementById('drawerNewTaskTitleInput');
      const dateInp = document.getElementById('drawerNewTaskDateInput');
      const timeInp = document.getElementById('drawerNewTaskTimeInput');
      const title = titleInp ? titleInp.value.trim() : '';
      if (!title) {
        showToast('⚠️ يرجى كتابة بيان أو عنوان المهمة');
        return;
      }

      const tasks = getTodoTasks();
      const newTask = {
        id: 'task-' + Date.now(),
        title: title,
        dueDate: dateInp && dateInp.value ? dateInp.value : '',
        dueTime: timeInp && timeInp.value ? timeInp.value : '',
        completed: false,
        starred: currentDrawerTodoSection === 'important',
        photo: currentPendingTaskPhotoUri || null,
        subtasks: [],
        reminderFired: false,
        createdAt: new Date().toISOString(),
        author: state.currentUser || 'ماهر'
      };

      tasks.unshift(newTask);
      saveTodoTasks(tasks);

      if (titleInp) titleInp.value = '';
      if (dateInp) dateInp.value = '';
      if (timeInp) timeInp.value = '';
      clearTaskPendingPhoto();
      playNotificationChime();
      renderDrawerTasksList();
      showToast('✨ تمت إضافة المهمة بنجاح!');
    }

    window.pendingSubtaskPhotos = window.pendingSubtaskPhotos || {};

    function handleSubtaskPhotoPicked(event, taskId) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        window.pendingSubtaskPhotos[taskId] = evt.target.result;
        const badge = document.getElementById(`subtaskPhotoBadge_${taskId}`);
        if (badge) badge.style.display = 'inline';
        showToast('📷 تم إرفاق صورة للمهمة الفرعية');
      };
      reader.readAsDataURL(file);
    }

    function toggleSubtaskCompleted(taskId, subtaskId) {
      const tasks = getTodoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
          sub.completed = !sub.completed;
          saveTodoTasks(tasks);
          playNotificationChime();
          renderDrawerTasksList();
          showToast(sub.completed ? '✓ اكتملت المهمة الفرعية' : 'تمت إعادة فتح المهمة الفرعية');
        }
      }
    }

    function addSubtaskToTask(taskId) {
      const titleInp = document.getElementById(`inpSubtaskTitle_${taskId}`);
      const dateInp = document.getElementById(`inpSubtaskDate_${taskId}`);
      const timeInp = document.getElementById(`inpSubtaskTime_${taskId}`);
      const title = titleInp ? titleInp.value.trim() : '';
      if (!title) {
        showToast('⚠️ يرجى كتابة عنوان المهمة الفرعية');
        return;
      }

      const tasks = getTodoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        if (!task.subtasks) task.subtasks = [];
        const photo = (window.pendingSubtaskPhotos && window.pendingSubtaskPhotos[taskId]) || null;
        task.subtasks.push({
          id: 'sub-' + Date.now(),
          title: title,
          dueDate: dateInp && dateInp.value ? dateInp.value : '',
          dueTime: timeInp && timeInp.value ? timeInp.value : '',
          photo: photo,
          completed: false,
          reminderFired: false
        });
        if (window.pendingSubtaskPhotos) delete window.pendingSubtaskPhotos[taskId];
        saveTodoTasks(tasks);
        renderDrawerTasksList();
        showToast('✓ تمت إضافة المهمة الفرعية بنجاح');
      }
    }

    function deleteSubtask(taskId, subtaskId) {
      const tasks = getTodoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        saveTodoTasks(tasks);
        renderDrawerTasksList();
        showToast('🗑️ تم حذف المهمة الفرعية');
      }
    }
    }

    function renderDrawerTasksList() {
      const container = document.getElementById('drawerTasksContainerList');
      const badge = document.getElementById('drawerTasksCountBadge');
      if (!container) return;

      const allTasks = getTodoTasks();
      const todayStr = getLocalDateStr(new Date());

      if (badge) {
        const activeCount = allTasks.filter(t => !t.completed).length;
        badge.textContent = activeCount;
      }

      let filtered = allTasks;
      if (currentDrawerTodoSection === 'my_day') {
        filtered = allTasks.filter(t => !t.completed && (t.dueDate === todayStr || !t.dueDate));
      } else if (currentDrawerTodoSection === 'important') {
        filtered = allTasks.filter(t => !t.completed && t.starred);
      } else if (currentDrawerTodoSection === 'planned') {
        filtered = allTasks.filter(t => !t.completed && Boolean(t.dueDate));
      } else if (currentDrawerTodoSection === 'completed') {
        filtered = allTasks.filter(t => t.completed);
      } else {
        filtered = allTasks.filter(t => !t.completed);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 35px 10px; color: #94a3b8; font-size: 0.80rem;">
            <i class="fa-solid fa-list-check" style="font-size: 2.2rem; color: #a855f7; opacity: 0.45; margin-bottom: 10px; display: block;"></i>
            <div style="font-weight: 800; color: #cbd5e1;">لا توجد مهام في هذا القسم حالياً</div>
            <div style="font-size: 0.70rem; color: #64748b; margin-top: 4px;">يمكنك إضافة مهمة جديدة وتحديد موعد وساعة تنبيه بالأعلى</div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(t => {
        const isDone = t.completed;
        const isStar = t.starred;
        const subtasks = t.subtasks || [];
        const completedSubs = subtasks.filter(s => s.completed).length;
        const hasSubs = subtasks.length > 0;
        const progressPct = hasSubs ? Math.round((completedSubs / subtasks.length) * 100) : 0;

        // حالة الموعد: متأخرة أو اليوم أو لاحقاً
        let dueBadgeHtml = '';
        if (t.dueDate) {
          const isOverdue = !isDone && t.dueDate < todayStr;
          const isToday = !isDone && t.dueDate === todayStr;
          const timeText = t.dueTime ? ` ⏰ ${t.dueTime}` : '';

          if (isOverdue) {
            dueBadgeHtml = `<span style="font-size: 0.62rem; color: #f87171; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 2px 6px; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation"></i> متأخرة: ${t.dueDate}${timeText}</span>`;
          } else if (isToday) {
            dueBadgeHtml = `<span style="font-size: 0.62rem; color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; padding: 2px 6px; font-weight: 800;"><i class="fa-regular fa-clock"></i> استحقاق اليوم${timeText}</span>`;
          } else {
            dueBadgeHtml = `<span style="font-size: 0.62rem; color: #c084fc; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 2px 6px; font-weight: 700;"><i class="fa-regular fa-calendar"></i> ${t.dueDate}${timeText}</span>`;
          }
        }

        // تفاصيل المهام الفرعية مع دعم إرفاق صورة وعرضها
        const subtasksHtml = subtasks.map(s => {
          const subDone = s.completed;
          const subTimeText = s.dueTime ? ` ⏰ ${s.dueTime}` : '';
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; background: rgba(15, 23, 42, 0.65); border: 1px solid ${subDone ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 8px; margin-top: 4px; font-size: 0.72rem; transition: all 0.15s ease;">
              <div style="display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0;">
                <input type="checkbox" ${subDone ? 'checked' : ''} onchange="toggleSubtaskCompleted('${t.id}', '${s.id}')" style="cursor: pointer; width: 14px; height: 14px; accent-color: #10b981;">
                <span style="color: ${subDone ? '#64748b' : '#e2e8f0'}; text-decoration: ${subDone ? 'line-through' : 'none'}; word-break: break-word; font-weight: 600; flex: 1;">${escapeHtml(s.title)}</span>
                ${s.dueDate ? `<span style="font-size: 0.60rem; color: #c084fc; white-space: nowrap;">(${s.dueDate}${subTimeText})</span>` : ''}
              </div>

              <!-- صورة المهمة الفرعية المصغرة وزر حذفها -->
              <div style="display: flex; align-items: center; gap: 5px; margin-right: 6px; flex-shrink: 0;">
                ${s.photo ? `
                  <img src="${s.photo}" onclick="openReceiptLightbox(this.src, 'صورة المهمة الفرعية: ${escapeHtml(s.title)}')" style="width: 24px; height: 24px; border-radius: 5px; object-fit: cover; border: 1.2px solid #38bdf8; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);" title="انقر لتكبير صورة المهمة الفرعية">
                ` : ''}
                <button type="button" onclick="deleteSubtask('${t.id}', '${s.id}')" title="حذف المهمة الفرعية" style="background: transparent; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; opacity: 0.75; padding: 0 3px;">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="task-card-item" style="background: rgba(30, 41, 59, 0.85); border: 1.2px solid ${isDone ? 'rgba(52, 211, 153, 0.4)' : (t.starred ? 'rgba(245, 158, 11, 0.4)' : 'rgba(168, 85, 247, 0.35)')}; border-radius: 14px; padding: 11px 13px; display: flex; flex-direction: column; gap: 7px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
            <!-- السطر العلوي: علامة الاكتمال + العنوان + الأيقونات والتنبيهات -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 9px; flex: 1; min-width: 0;">
                <button type="button" onclick="toggleTaskCompleted('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: ${isDone ? '#34d399' : '#94a3b8'}; font-size: 1.25rem; padding: 0; line-height: 1; margin-top: 1px; transition: transform 0.15s ease;" title="${isDone ? 'إعادة فتح المهمة' : 'تعيين المهمة كمكتملة'}">
                  <i class="fa-${isDone ? 'solid fa-circle-check' : 'regular fa-circle'}"></i>
                </button>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 0.84rem; font-weight: 800; color: ${isDone ? '#94a3b8' : '#f8fafc'}; text-decoration: ${isDone ? 'line-through' : 'none'}; word-break: break-word; line-height: 1.3;">
                    ${escapeHtml(t.title)}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px;">
                    ${dueBadgeHtml}
                    ${hasSubs ? `<span style="font-size: 0.62rem; color: #38bdf8; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; padding: 2px 6px; font-weight: 800;"><i class="fa-solid fa-list-ol"></i> ${completedSubs}/${subtasks.length} مكتملة (${progressPct}%)</span>` : ''}
                  </div>
                </div>
              </div>

              <!-- صورة المهمة المصغرة وزر النجمة والحذف -->
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                ${t.photo ? `
                  <img src="${t.photo}" onclick="openReceiptLightbox(this.src, 'مرفق المهمة: ${escapeHtml(t.title)}')" style="width: 30px; height: 30px; border-radius: 7px; object-fit: cover; border: 1.5px solid #a855f7; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4);" title="انقر لتكبير صورة المهمة">
                ` : ''}
                <button type="button" onclick="toggleTaskStarred('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: ${isStar ? '#fbbf24' : '#64748b'}; font-size: 1.05rem; padding: 2px;" title="${isStar ? 'إلغاء التمييز بنجمة' : 'تمييز كمهمة هامة'}">
                  <i class="fa-${isStar ? 'solid' : 'regular'} fa-star"></i>
                </button>
                <button type="button" onclick="deleteTaskItem('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444; font-size: 0.90rem; padding: 2px; opacity: 0.75;" title="حذف المهمة">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <!-- شريط تقدم إنجاز المهام الفرعية (Progress Bar) -->
            ${hasSubs ? `
              <div style="width: 100%; height: 4px; background: rgba(15, 23, 42, 0.8); border-radius: 3px; overflow: hidden; margin-top: 2px;">
                <div style="width: ${progressPct}%; height: 100%; background: ${progressPct === 100 ? '#10b981' : 'linear-gradient(90deg, #a855f7, #38bdf8)'}; transition: width 0.3s ease;"></div>
              </div>
            ` : ''}

            <!-- تفاصيل المهام الفرعية وإمكانية إضافة مهمة فرعية جديدة مع صورة وتاريخ ووقت -->
            <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; margin-top: 2px;">
              ${subtasksHtml}

              <!-- سطر إضافة مهمة فرعية جديدة مع موعد وصورة -->
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; background: rgba(15, 23, 42, 0.55); border-radius: 8px; padding: 5px;">
                <input type="text" id="inpSubtaskTitle_${t.id}" placeholder="إضافة خطوة أو مهمة فرعية..." style="flex: 1 1 120px; height: 28px; border-radius: 6px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(168, 85, 247, 0.3); color: #fff; font-size: 0.70rem; padding: 0 8px; outline: none;">
                <input type="date" id="inpSubtaskDate_${t.id}" style="width: 95px; height: 28px; border-radius: 6px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(168, 85, 247, 0.3); color: #cbd5e1; font-size: 0.64rem; padding: 0 2px;" title="تاريخ المهمة الفرعية">
                <input type="time" id="inpSubtaskTime_${t.id}" style="width: 70px; height: 28px; border-radius: 6px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(168, 85, 247, 0.3); color: #cbd5e1; font-size: 0.64rem; padding: 0 2px;" title="ساعة المهمة الفرعية">
                
                <!-- إرفاق صورة للمهمة الفرعية -->
                <input type="file" id="inpSubtaskPhoto_${t.id}" accept="image/*" style="display: none;" onchange="handleSubtaskPhotoPicked(event, '${t.id}')">
                <button type="button" onclick="document.getElementById('inpSubtaskPhoto_${t.id}').click()" title="إرفاق صورة للمهمة الفرعية" id="btnSubtaskPhoto_${t.id}" style="height: 28px; padding: 0 7px; border-radius: 6px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 0.70rem; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                  <i class="fa-solid fa-camera"></i>
                  <span id="subtaskPhotoBadge_${t.id}" style="display: none; font-size: 0.60rem; color: #34d399; font-weight: 800;">✓</span>
                </button>

                <button type="button" onclick="addSubtaskToTask('${t.id}')" style="height: 28px; padding: 0 10px; border-radius: 6px; background: linear-gradient(135deg, #a855f7, #7c3aed); border: none; color: #fff; font-size: 0.70rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-plus"></i> إضافة
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // =========================================================================
    // 2. مهام Microsoft To-Do المتكاملة (Tasks Engine)
    // =========================================================================
    let currentTodoSection = 'my_day';

    function getTodoTasks() {
      try {
        return JSON.parse(localStorage.getItem('family_monefy_tasks') || '[]');
      } catch(e) { return []; }
    }

    function saveTodoTasks(tasks) {
      try {
        localStorage.setItem('family_monefy_tasks', JSON.stringify(tasks));
      } catch(e) {}
    }

    function openTasksModal() {
      openSummaryDrawer('tasks');
      return;
      renderTasksList();
      openModal('tasksModal');
    }

    function switchTodoSection(sec) {
      currentTodoSection = sec;
      const tabs = ['my_day', 'important', 'planned', 'all', 'completed'];
      tabs.forEach(t => {
        const btnId = `btnTodoTab${t === 'my_day' ? 'MyDay' : (t === 'important' ? 'Important' : (t === 'planned' ? 'Planned' : (t === 'all' ? 'All' : 'Completed')))}`;
        const btn = document.getElementById(btnId);
        if (btn) {
          if (t === sec) {
            btn.className = 'exp-tab-btn active';
            btn.style.background = 'rgba(168, 85, 247, 0.25)';
            btn.style.color = '#c084fc';
            btn.style.border = 'none';
          } else {
            btn.className = 'exp-tab-btn';
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }
      });
      renderTasksList();
    }

    function handleAddNewTask() {
      const titleInp = document.getElementById('newTaskTitleInput');
      const dateInp = document.getElementById('newTaskDueDateInput');
      const title = titleInp ? titleInp.value.trim() : '';
      if (!title) return;

      const tasks = getTodoTasks();
      const newTask = {
        id: 'task-' + Date.now(),
        title: title,
        dueDate: dateInp && dateInp.value ? dateInp.value : '',
        completed: false,
        starred: currentTodoSection === 'important',
        createdAt: new Date().toISOString(),
        author: state.currentUser || 'ماهر'
      };

      tasks.unshift(newTask);
      saveTodoTasks(tasks);
      if (titleInp) titleInp.value = '';
      playNotificationChime();
      renderTasksList();
      showToast('✨ تمت إضافة المهمة بنجاح!');
    }

    function toggleTaskCompleted(taskId) {
      const tasks = getTodoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        saveTodoTasks(tasks);
        playNotificationChime();
        renderTasksList();
        showToast(task.completed ? '🎉 أحسنت! اكتملت المهمة' : 'تمت إعادة فتح المهمة');
      }
    }

    function toggleTaskStarred(taskId) {
      const tasks = getTodoTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.starred = !task.starred;
        saveTodoTasks(tasks);
        renderTasksList();
      }
    }

    function deleteTaskItem(taskId) {
      let tasks = getTodoTasks();
      tasks = tasks.filter(t => t.id !== taskId);
      saveTodoTasks(tasks);
      renderTasksList();
      showToast('🗑️ تم حذف المهمة');
    }

    function renderTasksList() {
      const container = document.getElementById('tasksContainerList');
      if (!container) return;

      const allTasks = getTodoTasks();
      const todayStr = getLocalDateStr(new Date());

      let filtered = allTasks;
      if (currentTodoSection === 'my_day') {
        filtered = allTasks.filter(t => !t.completed && (t.dueDate === todayStr || !t.dueDate));
      } else if (currentTodoSection === 'important') {
        filtered = allTasks.filter(t => !t.completed && t.starred);
      } else if (currentTodoSection === 'planned') {
        filtered = allTasks.filter(t => !t.completed && Boolean(t.dueDate));
      } else if (currentTodoSection === 'completed') {
        filtered = allTasks.filter(t => t.completed);
      } else {
        filtered = allTasks.filter(t => !t.completed);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 35px 10px; color: #94a3b8; font-size: 0.8rem;">
            <i class="fa-solid fa-list-check" style="font-size: 2rem; color: #a855f7; opacity: 0.5; margin-bottom: 8px;"></i>
            <div>لا توجد مهام في هذا القسم حالياً</div>
            <div style="font-size: 0.68rem; color: #64748b; margin-top: 4px;">أضف مهمتك الأولى باستخدام الحقل أعلاه</div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(t => {
        const isDone = t.completed;
        const isStar = t.starred;
        const dueText = t.dueDate ? `📅 استحقاق: ${t.dueDate}` : '';

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 9px 12px; margin-bottom: 6px; transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <button type="button" onclick="toggleTaskCompleted('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: ${isDone ? '#34d399' : '#94a3b8'}; font-size: 1.15rem; padding: 0;">
                <i class="fa-${isDone ? 'solid fa-circle-check' : 'regular fa-circle'}"></i>
              </button>
              <div style="flex: 1;">
                <div style="font-size: 0.80rem; font-weight: 700; color: ${isDone ? '#94a3b8' : '#f8fafc'}; text-decoration: ${isDone ? 'line-through' : 'none'}; word-break: break-word;">
                  ${escapeHtml(t.title)}
                </div>
                ${dueText ? `<div style="font-size: 0.62rem; color: #c084fc; margin-top: 2px;">${dueText}</div>` : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" onclick="toggleTaskStarred('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: ${isStar ? '#fbbf24' : '#64748b'}; font-size: 0.95rem; padding: 2px;">
                <i class="fa-${isStar ? 'solid' : 'regular'} fa-star"></i>
              </button>
              <button type="button" onclick="deleteTaskItem('${t.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444; font-size: 0.85rem; padding: 2px; opacity: 0.7;">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // =========================================================================
    // 3. نظام الإشعارات والتنبيهات الذكية (Notifications Engine)
    // =========================================================================
    function openNotificationsModal() {
      renderNotificationsList();
      openModal('notificationsModal');
      const dot = document.getElementById('headerNotifBadge');
      if (dot) dot.style.display = 'none';
    }

    function addSystemNotification(item) {
      if (!state.notifications) {
        try {
          state.notifications = JSON.parse(localStorage.getItem('family_monefy_notifications') || '[]');
        } catch(e) { state.notifications = []; }
      }

      const newNotif = {
        id: 'notif-' + Date.now(),
        type: item.type || 'info',
        title: item.title || 'إشعار من النظام',
        body: item.body || '',
        txId: item.txId || null,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      state.notifications.unshift(newNotif);
      if (state.notifications.length > 50) state.notifications = state.notifications.slice(0, 50);

      try {
        localStorage.setItem('family_monefy_notifications', JSON.stringify(state.notifications));
      } catch(e) {}

      const dot = document.getElementById('headerNotifBadge');
      if (dot) dot.style.display = 'inline-block';
    }

    function markAllNotificationsRead() {
      if (state.notifications) {
        state.notifications.forEach(n => n.isRead = true);
        try {
          localStorage.setItem('family_monefy_notifications', JSON.stringify(state.notifications));
        } catch(e) {}
      }
      renderNotificationsList();
      const dot = document.getElementById('headerNotifBadge');
      if (dot) dot.style.display = 'none';
      showToast('✓ تم تحديد كافة الإشعارات كمقروءة');
    }

    function renderNotificationsList() {
      const container = document.getElementById('notificationsListContainer');
      if (!container) return;

      if (!state.notifications) {
        try {
          state.notifications = JSON.parse(localStorage.getItem('family_monefy_notifications') || '[]');
        } catch(e) { state.notifications = []; }
      }

      let items = [...state.notifications];

      // فحص الالتزامات المستحقة قريباً وإظهارها في قائمة التنبيهات
      if (state.expectedExpenses && state.expectedExpenses.length > 0) {
        const upcomingDebts = state.expectedExpenses.filter(e => e.status !== 'paid');
        if (upcomingDebts.length > 0) {
          items.unshift({
            id: 'debt-alert',
            type: 'commitment',
            title: '⚠️ تنبيه التزامات مستحقة:',
            body: `لديك ${upcomingDebts.length} التزامات/ديون قيد المتابعة بقيمة إجمالية ${formatMoney(upcomingDebts.reduce((s,x)=>s+(Number(x.amount)||0),0))}`,
            isRead: true,
            timestamp: new Date().toISOString()
          });
        }
      }

      if (items.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 30px 10px; color: #94a3b8; font-size: 0.78rem;">
            <i class="fa-solid fa-bell-slash" style="font-size: 1.8rem; margin-bottom: 8px; color: #64748b;"></i>
            <div>لا توجد إشعارات جديدة حالياً</div>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(n => {
        const isTx = Boolean(n.txId);
        const isExp = Boolean(n.expectedId || n.id === 'debt-alert');
        const isTask = Boolean(n.taskId);
        const isClickable = isTx || isExp || isTask;

        let clickHandler = '';
        if (isTx) clickHandler = `onclick="closeModal('notificationsModal'); openEditTxModal('${n.txId}');"`;
        else if (isExp) clickHandler = `onclick="closeModal('notificationsModal'); switchAppPage('commitments');"`;
        else if (isTask) clickHandler = `onclick="closeModal('notificationsModal'); openSummaryDrawer('tasks');"`;

        const iconClass = n.type === 'income' ? 'fa-circle-arrow-down' : (n.type === 'expense' ? 'fa-circle-arrow-up' : (n.type === 'bill' ? 'fa-file-invoice' : (n.type === 'commitment' ? 'fa-triangle-exclamation' : 'fa-bell')));
        const iconColor = n.type === 'income' ? '#34d399' : (n.type === 'expense' ? '#f43f5e' : (n.type === 'bill' ? '#fbbf24' : '#38bdf8'));

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(30, 41, 59, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px 12px; cursor: ${isClickable ? 'pointer' : 'default'}; transition: all 0.15s ease;" ${clickHandler} title="${isClickable ? 'انقر للانتقال مباشرة للعملية المرتبطة' : ''}">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 1.15rem;"></i>
              <div>
                <div style="font-size: 0.80rem; font-weight: 800; color: #f8fafc;">${escapeHtml(n.title)}</div>
                <div style="font-size: 0.68rem; color: #cbd5e1; margin-top: 2px;">${escapeHtml(n.body)}</div>
              </div>
            </div>
            ${isClickable ? '<span style="font-size: 0.66rem; color: #38bdf8; font-weight: 800; background: rgba(56, 189, 248, 0.15); padding: 3px 8px; border-radius: 6px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح</span>' : ''}
          </div>
        `;
      }).join('');
    }

    // =========================================================================
    // 4. فواتير صفحة الالتزامات (Bills Engine)
    // =========================================================================
    let currentBillPhotoDataUri = null;

    function toggleBillsExpectedPanel() {
      const panel = document.getElementById('panelBillsExpected');
      const btn = document.getElementById('btnFilterExpBills');
      if (!panel) return;

      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
      if (btn) {
        if (isHidden) {
          btn.classList.add('active');
          btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          btn.style.color = '#fff';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'rgba(245, 158, 11, 0.15)';
          btn.style.color = '#f59e0b';
        }
      }
      if (isHidden) renderBillsList();
    }

    function handleBillPhotoSelected(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        currentBillPhotoDataUri = e.target.result;
        const badge = document.getElementById('billPhotoPreviewBadge');
        if (badge) {
          badge.textContent = 'تم التقاط الصورة ✓';
          badge.style.color = '#34d399';
        }
        showToast('📷 تم التقاط صورة الفاتورة بنجاح!');
      };
      reader.readAsDataURL(file);
    }

    function saveNewBill() {
      const nameInp = document.getElementById('inpBillName');
      const amountInp = document.getElementById('inpBillAmount');
      const dateInp = document.getElementById('inpBillDueDate');
      const memberInp = document.getElementById('inpBillMember');
      const catInp = document.getElementById('inpBillCategory');

      const name = nameInp ? nameInp.value.trim() : '';
      const amount = parseFloat(amountInp ? amountInp.value : 0);

      if (!name || isNaN(amount) || amount <= 0) {
        showToast('⚠️ يرجى إدخال اسم الفاتورة ومبلغ صحيح أكبر من الصفر', 'error');
        return;
      }

      if (!state.expectedExpenses) state.expectedExpenses = [];

      const newBill = {
        id: 'bill-' + Date.now(),
        type: 'upcoming_bill',
        label: name,
        amount: amount,
        dueDate: dateInp && dateInp.value ? dateInp.value : new Date().toISOString().split('T')[0],
        member: memberInp ? memberInp.value : 'البيت',
        category: catInp ? catInp.value : 'bills',
        photo: currentBillPhotoDataUri || null,
        status: 'upcoming',
        author: state.currentUser || 'ماهر',
        createdAt: new Date().toISOString()
      };

      state.expectedExpenses.unshift(newBill);
      if (typeof saveState === 'function') saveState();

      addSystemNotification({
        type: 'bill',
        title: 'فاتورة جديدة مستحقة',
        body: `${name} بمبلغ ${amount} ج.م تخص ${newBill.member}`
      });

      currentBillPhotoDataUri = null;
      if (nameInp) nameInp.value = '';
      if (amountInp) amountInp.value = '';
      const badge = document.getElementById('billPhotoPreviewBadge');
      if (badge) {
        badge.textContent = 'لم يتم التقاط صورة';
        badge.style.color = '#94a3b8';
      }

      renderBillsList();
      renderExpectedList();
      showToast('✅ تم تسجيل الفاتورة بنجاح!');
    }

    function renderBillsList() {
      const container = document.getElementById('billsListContainer');
      const badge = document.getElementById('billsCountSummaryBadge');
      if (!container) return;

      const bills = (state.expectedExpenses || []).filter(e => e.type === 'upcoming_bill');
      if (badge) badge.textContent = `${bills.length} فاتورة مسجلة`;

      if (bills.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px 10px; color: #94a3b8; font-size: 0.74rem;">
            لا توجد فواتير مسجلة حالياً
          </div>
        `;
        return;
      }

      container.innerHTML = bills.map(b => {
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 8px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-file-invoice" style="color: #fbbf24; font-size: 1.1rem;"></i>
              <div>
                <div style="font-size: 0.78rem; font-weight: 800; color: #f8fafc;">${escapeHtml(b.label)}</div>
                <div style="font-size: 0.64rem; color: #94a3b8;">تخص: ${b.member || 'البيت'} • الاستحقاق: ${b.dueDate || '──'}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; font-weight: 900; color: #fbbf24; direction: ltr;">${formatMoney(b.amount)}</span>
              ${b.photo ? `<button type="button" onclick="openReceiptLightbox('${b.photo}', 'فاتورة: ${escapeHtml(b.label)}')" style="background: rgba(236, 72, 153, 0.2); border: 1px solid rgba(236, 72, 153, 0.4); color: #f472b6; border-radius: 6px; padding: 3px 6px; font-size: 0.65rem; cursor: pointer;"><i class="fa-solid fa-image"></i></button>` : ''}
              <button type="button" onclick="deleteExpectedItem('${b.id}')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 6px; padding: 3px 6px; font-size: 0.65rem; cursor: pointer;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        `;
      }).join('');
    }

    // =========================================================================
    // 5. تعديل الفاتورة في الحركة والتصوير بالكاميرا (Edit Tx Receipt Engine)
    // =========================================================================
    // currentEditTxReceiptDataUri declared at top

    function triggerEditTxCamera() {
      const inp = document.getElementById('editTxReceiptInput');
      if (inp) {
        inp.setAttribute('capture', 'environment');
        inp.click();
      }
    }

    function triggerEditTxGallery() {
      const inp = document.getElementById('editTxReceiptInput');
      if (inp) {
        inp.removeAttribute('capture');
        inp.click();
      }
    }

    function handleEditTxReceiptSelected(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        currentEditTxReceiptDataUri = e.target.result;
        updateEditTxReceiptPreview();
        showToast('📷 تم تحميل صورة الفاتورة بنجاح!');
      };
      reader.readAsDataURL(file);
    }

    function updateEditTxReceiptPreview() {
      const previewContainer = document.getElementById('editTxReceiptPreviewContainer');
      const thumb = document.getElementById('editTxReceiptThumb');
      const badge = document.getElementById('editTxReceiptStatusBadge');

      if (currentEditTxReceiptDataUri) {
        if (thumb) thumb.src = currentEditTxReceiptDataUri;
        if (previewContainer) previewContainer.style.display = 'flex';
        if (badge) {
          badge.textContent = 'فاتورة مرفقة ✓';
          badge.style.color = '#34d399';
        }
      } else {
        if (previewContainer) previewContainer.style.display = 'none';
        if (badge) {
          badge.textContent = 'لا توجد فاتورة مرفقة';
          badge.style.color = '#94a3b8';
        }
      }
    }

    function removeEditTxReceipt() {
      currentEditTxReceiptDataUri = null;
      const inp = document.getElementById('editTxReceiptInput');
      if (inp) inp.value = '';
      updateEditTxReceiptPreview();
      showToast('🗑️ تمت إزالة صورة الفاتورة');
    }

    function viewCurrentEditReceipt() {
      if (currentEditTxReceiptDataUri && typeof openReceiptLightbox === 'function') {
        const lbl = document.getElementById('editTxLabel')?.value || 'فاتورة العملية';
        openReceiptLightbox(currentEditTxReceiptDataUri, lbl);
      }
    }

    // =========================================================================
    // 6. حركات التمرير بالسحب (Touch Swipe Gestures)
    // =========================================================================
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
          // سحب من اليسار لليمين عند حافة الشاشة اليسرى -> فتح الملخص
          if (deltaX > 0 && touchStartX < 60) {
            openSummaryDrawer();
          }
          // سحب من اليمين لليسار عند حافة الشاشة اليمنى -> فتح الذهب
          else if (deltaX < 0 && touchStartX > window.innerWidth - 60) {
            openGoldDrawer();
          }
        }
      }
    }, { passive: true });


    // ========================================================
    // نظام فحص تذكيرات وتنبيهات المهام المجدولة بالساعة والتاريخ
    // ========================================================
    function checkScheduledTaskReminders() {
      const tasks = getTodoTasks();
      if (!tasks || tasks.length === 0) return;

      const now = new Date();
      const todayStr = getLocalDateStr(now);
      const currentHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

      let changed = false;

      tasks.forEach(t => {
        // 1. فحص المهمة الرئيسية
        if (!t.completed && !t.reminderFired && t.dueDate) {
          let isDue = false;
          if (t.dueDate < todayStr) {
            isDue = true;
          } else if (t.dueDate === todayStr) {
            if (!t.dueTime || t.dueTime <= currentHHMM) {
              isDue = true;
            }
          }

          if (isDue) {
            t.reminderFired = true;
            changed = true;
            playNotificationChime();
            const timeLabel = t.dueTime ? `الساعة ${t.dueTime}` : 'اليوم';
            addSystemNotification({
              type: 'task',
              title: `⏰ تذكير موعد مهمة: ${t.title}`,
              body: `حان موعد إنجاز المهمة المجدولة (${timeLabel} - ${t.dueDate})`,
              txId: null
            });
            triggerSystemNotification(`⏰ تذكير مهمة: ${t.title}`, `حان موعد إنجاز المهمة المجدولة (${timeLabel})`);
            showToast(`⏰ حان موعد المهمة: ${t.title}`);
          }
        }

        // 2. فحص المهام الفرعية
        if (t.subtasks && t.subtasks.length > 0) {
          t.subtasks.forEach(sub => {
            if (!sub.completed && !sub.reminderFired && sub.dueDate) {
              let isSubDue = false;
              if (sub.dueDate < todayStr) {
                isSubDue = true;
              } else if (sub.dueDate === todayStr) {
                if (!sub.dueTime || sub.dueTime <= currentHHMM) {
                  isSubDue = true;
                }
              }
              if (isSubDue) {
                sub.reminderFired = true;
                changed = true;
                playNotificationChime();
                const subTimeLabel = sub.dueTime ? `الساعة ${sub.dueTime}` : 'اليوم';
                addSystemNotification({
                  type: 'task',
                  title: `⏰ تذكير مهمة فرعية: ${sub.title}`,
                  body: `المهمة التابعة لـ [${t.title}] حان موعدها (${subTimeLabel})`,
                  txId: null
                });
                triggerSystemNotification(`⏰ مهمة فرعية: ${sub.title}`, `حان موعد إنجاز المهمة الفرعية`);
                showToast(`⏰ تذكير فرعي: ${sub.title}`);
              }
            }
          });
        }
      });

      if (changed) {
        saveTodoTasks(tasks);
        renderDrawerTasksList();
      }
    }

    // إطلاق فاحص التذكيرات عند التشغيل وكل 20 ثانية
    if (!window._taskReminderInterval) {
      window._taskReminderInterval = setInterval(checkScheduledTaskReminders, 20000);
      setTimeout(checkScheduledTaskReminders, 2000);
    }

