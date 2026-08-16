import DataGrid from "../data-grid.js";

const labels = {
    itemsPerPage: "प्रति पृष्ठ आइटम",
    gotoPage: "पृष्ठ पर जाएँ",
    gotoFirstPage: "पहला पृष्ठ",
    gotoPrevPage: "पिछला पृष्ठ",
    gotoNextPage: "अगला पृष्ठ",
    gotoLastPage: "अंतिम पृष्ठ",
    pageStatus: "पृष्ठ {page} / {pages}",
    resultCount: "आइटम: {count}",
    selectedCount: "चयनित: {count}",
    selectAll: "सभी पंक्तियाँ चुनें",
    selectRow: "{row} चुनें",
    toggleActions: "पंक्ति क्रियाएँ दिखाएँ",
    resizeColumn: "कॉलम का आकार बदलें",
    noData: "कोई डेटा नहीं",
    loading: "लोड हो रहा है…",
    areYouSure: "क्या आप सुनिश्चित हैं?",
    networkError: "लोड करने में त्रुटि",
};

DataGrid.setLabels(labels);

export default labels;
