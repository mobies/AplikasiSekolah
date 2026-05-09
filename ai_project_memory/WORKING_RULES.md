# Working Rules: RTDB Efficiency & Cost Optimization

To ensure optimal performance, low bandwidth usage, and cost efficiency in our Realtime Database (RTDB) architecture, the following rules MUST be followed:

## 1. Granular Data Access
- **Never read large trees**: Avoid calling `onValue` or `get` on root nodes like `/schools` if only specific data is needed.
- **Specific Child Paths**: Always aim for the deepest specific path (e.g., `/schools/{npsn}/status` instead of `/schools/{npsn}`).

## 2. Denormalization for Bandwidth
- **Metadata Tables**: Create shallow paths for lists used in dashboards (e.g., `/school_list/{npsn}` containing only `name` and `status`) to avoid fetching full school details during listing.
- **Access Maps**: Keep user access maps shallow (e.g., `/users/{uid}/schools/{npsn}: true`) to minimize login payload.

## 3. Shallow Structures
- **Avoid Deep Nesting**: Limit nesting to 3-4 levels maximum. Deeply nested data forces unnecessary bandwidth usage when reading parent nodes.
- **Flatten Data**: Separate "static" details from "dynamic" or "frequently updated" data.

## 4. Server-Side Filtering (Indexing)
- **Use .indexOn**: Always define `.indexOn` in `database.rules.json` for any field used in `orderByChild` to ensure filtering happens on the server, not the client.

## 5. Efficient Updates
- **Use .update() instead of .set()**: Use `update()` to modify specific fields without overwriting (and thus sending) the entire object back to the server.
- **Atomic Operations**: Use `update()` with multi-path keys for cross-node synchronization to ensure data integrity with minimal round-trips.

## 6. Firestore Clean-up
- **Zero Firestore Usage**: No new features or refactors should use Firestore.
- **Legacy Removal**: All existing Firestore logic must be migrated to these efficient RTDB patterns.
