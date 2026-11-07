
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

