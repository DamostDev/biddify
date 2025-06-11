// frontend/src/components/stream/EmotionTracker.jsx
import React, { useEffect, useRef } from 'react';
import useEmotionStore from '../../services/emotionStore';
import * as d3 from 'd3';

const EmotionTracker = ({ topN = 5 }) => {
  const counts = useEmotionStore((s) => s.counts);
  const svgRef = useRef();

  useEffect(() => {
    // --- DEBUG LOG ---
    console.log('%c[EmotionTracker] Chart effect is running with counts:', 'color: #f59e0b;', counts);

    if (!counts || Object.keys(counts).length === 0) {
      // Clear the SVG if there are no counts
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    };

    const dataArray = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const top = dataArray.slice(0, topN);

    // D3 setup
    const svg = d3.select(svgRef.current);
    const width = 350;
    const height = 220;
    const margin = { top: 20, right: 10, bottom: 50, left: 30 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(top.map(d => d.name))
      .range([0, innerW])
      .padding(0.2);

    const yMax = d3.max(top, d => d.count) || 1;
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerH, 0]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(Math.min(5, yMax)).tickFormat(d3.format('d'));

    const primaryColor = "#facc15";
    const textColor = "#d4d4d4";

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('fill', textColor)
        .attr('font-size', '10px')
        .attr('class', 'capitalize');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
        .attr('fill', textColor)
        .attr('font-size', '10px');

    g.selectAll('.bar')
      .data(top)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name))
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerH - yScale(d.count))
      .attr('fill', primaryColor);

    g.selectAll('.label')
      .data(top)
      .join('text')
      .attr('class', 'label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', primaryColor)
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(d => d.count > 0 ? d.count : '');

  }, [counts, topN]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sortedEmotions = Object.entries(counts).filter(([,count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const topEmotion = sortedEmotions[0]?.[0] || 'N/A';

  return (
    <div className="p-3">
        <svg ref={svgRef} className="w-full h-auto" />
        <div className="grid grid-cols-2 gap-2 text-center p-3 mt-2 bg-neutral-900/50 rounded-lg">
            <div>
                <div className="font-bold text-lg text-white">{total}</div>
                <div className="text-xs text-neutral-400 uppercase">Total Messages</div>
            </div>
            <div>
                <div className="font-bold text-lg text-yellow-400 truncate capitalize">{topEmotion}</div>
                <div className="text-xs text-neutral-400 uppercase">Top Emotion</div>
            </div>
        </div>
    </div>
  );
};

export default EmotionTracker;