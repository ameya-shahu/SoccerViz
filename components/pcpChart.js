const pcpDimensions = [
    "timestamp",
    "x_start",
    "y_start",
    "x_end",
    "y_end",
    "area_score",
    "pass_until_shot",
    "rescaled_pressure_change",
    "pressure_rating"
]

const dimensionExtents = {
    "x_start": {"max": 120, "min": 0},
    "y_start": {"max": 90, "min": 0},
    "x_end": {"max": 120, "min": 0},
    "y_end": {"max": 90, "min": 0},
    "timestamp": {"max": 6000, "min": 0},
    "area_score": {"max": 10, "min": 0},
    "pass_until_shot": {"max": 10, "min": 0},
    "rescaled_pressure_change": {"max": 10, "min": 0},
    "pressure_rating": {"max": 10, "min": 0}
}



const selectedDimensions = new Set(pcpDimensions.slice(0, 6)); 
const margin = { top: 20, right: 50, bottom: 30, left: 50 };
const width = 1440 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

const svg = d3.select("#parallelCoordinates")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
            `translate(${margin.left},${margin.top})`);

const yScales = {};
const xScale = d3.scalePoint()
    .domain(pcpDimensions)
    .range([0, width]);

pcpDimensions.forEach(dim => {
    yScales[dim] = d3.scaleLinear()
        .domain([dimensionExtents[dim]["min"], dimensionExtents[dim]["max"]])
        .range([height, 0]);
});

function drawChart(pcpDdata, currentPlayer) {
    pcpDdata = pcpDdata.map(item => {
        const timeParts = item.timestamp.split(':'); 
        const minutes = parseInt(timeParts[1], 10); 
        const seconds = Math.floor(parseFloat(timeParts[2]));
        const MMSS = String(minutes).padStart(2, '0') + String(seconds).padStart(2, '0');
        return {
            ...item,
            timestamp: MMSS
        };
    });

    pcpDdata = pcpDdata.filter(item => item["player_id"] == currentPlayer["player_id"])

    svg.selectAll("*").remove();

    const activeDimensions = Array.from(selectedDimensions);

    xScale.domain(activeDimensions);

    svg.selectAll(".line")
        .data(pcpDdata)
        .join("path")
        .attr("class", "line")
        .attr("d", d => d3.line()(activeDimensions.map(dim => [xScale(dim), yScales[dim](d[dim]) || 0])))
        .style("stroke", "steelblue");

    svg.selectAll(".axis")
        .data(activeDimensions)
        .join("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xScale(d)},0)`)
        .each(function (d) {
            d3.select(this).call(d3.axisLeft(yScales[d]).ticks(4));
        });

    svg.selectAll(".axis-label")
        .data(activeDimensions)
        .join("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", d => xScale(d))
        .attr("y", height + 20)
        .text(d => d);
}


function addToggles(pcpData, currentPlayer){
    const controls = d3.select("#controls");
    controls.selectAll("*").remove();

    pcpDimensions.forEach(dim => {
        const toggle = controls.append("div")
            .attr("class", "toggle form-check form-switch");

        toggle.append("input")
            .attr("class", "form-check-input")
            .attr("type", "checkbox")
            .attr("id", dim)
            .property("checked", selectedDimensions.has(dim))
            .on("change", function () {
                if (this.checked) {
                    if (selectedDimensions.size < 6) {
                        selectedDimensions.add(dim);
                    } else {
                        this.checked = false; 
                    }
                } else {
                    selectedDimensions.delete(dim);
                }
                drawChart(pcpData, currentPlayer);
            });

        toggle.append("label")
            .attr("class", "form-check-label")
            .attr("for", dim)
            .text(dim);
    });
}

function pcpController(pcpData, currentPlayer){
    addToggles(pcpData, currentPlayer);
    drawChart(pcpData, currentPlayer);
}


