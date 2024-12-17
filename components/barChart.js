function drawBarChart(data, selectedPlayerName) {
  const width = 1520;
  const height = 600;
  const margin = { top: 20, right: 20, bottom: 140, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Clear existing chart
  d3.select("#barChart").selectAll("*").remove();

  const svg = d3
    .select("#barChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales considering weights
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([0, innerWidth])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.score * (d.weight || 1))])
    .range([innerHeight, 0]);

  // Draw bars with weighted heights
  svg
    .selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => xScale(d.name))
    .attr("y", (d) => yScale(d.score * (d.weight || 1)))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => innerHeight - yScale(d.score * (d.weight || 1)))
    .attr("fill", (d) =>
      d.name === selectedPlayerName ? "orange" : "steelblue"
    );

  // Add axes
  svg
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(yScale));

  // Add tooltip
  const tooltip = d3.select("#tooltip");

  // Add hover interactions with weighted values
  svg
    .selectAll(".bar")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "darkblue");

      tooltip.transition().duration(200).style("opacity", 0.9);

      tooltip
        .html(
          `${d.name}<br/>
          Weighted Score: ${(d.score * (d.weight || 1)).toFixed(2)}`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr(
        "fill",
        d.name === selectedPlayerName ? "orange" : "steelblue"
      );

      tooltip.transition().duration(500).style("opacity", 0);
    });

  // Add legend
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, 20)`);

  // Add colored rectangle
  legend
    .append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("x", -100)
    .attr("y", 14)
    .attr("fill", "orange");

  legend
    .append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("x", -100)
    .attr("y", 39)
    .attr("fill", "steelblue");

  // Add legend text
  legend
    .append("text")
    .attr("x", -76)
    .attr("y", 27)
    .text("Selected Player")
    .style("font-size", "12px");

  // Add legend text
  legend
    .append("text")
    .attr("x", -76)
    .attr("y", 52)
    .text("Other Players")
    .style("font-size", "12px");
}
