#!/bin/bash

# List of incident IDs greater than 400
INCIDENTS=(
  410 414 435 452 454 457 461 474 476 489 490 493 501
  509 510 519 520 526 545 547 554 564 574 576 583 594
  603 614 619
)

# Process each incident
for id in "${INCIDENTS[@]}"; do
  echo "Processing incident $id..."
  npm run generate-classifications -- --incidents="$id" --taxonomy="CSETv1" --output=cset-generation.csv
done

echo "All incidents processed." 