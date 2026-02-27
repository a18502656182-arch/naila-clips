"use client";

// app/components/HomeClient.js
import { useState } from "react";
import FiltersClient from "./FiltersClient";
import ClipsGridClient from "./ClipsGridClient";

export default function HomeClient({ initialItems, initialHasMore }) {
  const [filters, setFilters] = useState({
    sort: "newest",
    access: [],
    difficulty: [],
    topic: [],
    channel: [],
  });

  return (
    <div>
      <FiltersClient filters={filters} onFiltersChange={setFilters} />
      <div style={{ marginTop: 14 }}>
        <ClipsGridClient
          initialItems={initialItems}
          initialHasMore={initialHasMore}
          filters={filters}
        />
      </div>
    </div>
  );
}
