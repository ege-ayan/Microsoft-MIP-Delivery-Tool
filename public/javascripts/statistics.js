document.getElementById('accreditation_stats').addEventListener('click', function() {
    // Hardcoded data for testing
// Mocked data for testing
   // Mocked data for testing
var data = {
    accredited: 5,
    not_accredited: 3,
    total_mips: 10
};

var ctx = document.getElementById('accreditation_chart').getContext('2d');
var myPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
        datasets: [{
            data: [data.accredited, data.not_accredited, data.total_mips - data.accredited - data.not_accredited],
            backgroundColor: ['green', 'red', 'blue']
        }],
        labels: ['Accredited', 'Not Accredited', 'Remaining']
    }
});


});
