import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

function Chart({ form }) {
  const data = [
    { name: "Area", value: Number(form.area) },
    { name: "Bedrooms", value: Number(form.bedrooms) },
    { name: "Bathrooms", value: Number(form.bathrooms) }
  ];

  return (
    <LineChart width={320} height={200} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="#00f0ff" />
    </LineChart>
  );
}

export default Chart;