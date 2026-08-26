import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "عدد العناصر في الصفحة",
    gotoPage: "الانتقال إلى صفحة",
    gotoFirstPage: "الصفحة الأولى",
    gotoPrevPage: "الصفحة السابقة",
    gotoNextPage: "الصفحة التالية",
    gotoLastPage: "الصفحة الأخيرة",
    pageStatus: "صفحة {page} من {pages}",
    resultCount: "العناصر: {count}",
    selectedCount: "المحدد: {count}",
    selectAll: "تحديد كل الصفوف",
    selectRow: "تحديد {row}",
    toggleActions: "إظهار إجراءات الصف",
    showDetails: "إظهار تفاصيل {row}",
    hideDetails: "إخفاء تفاصيل {row}",
    showHiddenColumns: "إظهار الأعمدة الإضافية لـ {row}",
    hideHiddenColumns: "إخفاء الأعمدة الإضافية لـ {row}",
    resizeColumn: "تغيير حجم العمود",
    noData: "لا توجد بيانات",
    loading: "جارٍ التحميل…",
    areYouSure: "هل أنت متأكد؟",
    networkError: "خطأ في التحميل",
    booleanTrue: "نعم",
    booleanFalse: "لا",
};

DataGrid.setLabels(labels);

export default labels;
