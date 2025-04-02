#!/bin/bash

# List of incident IDs greater than 400
INCIDENTS=(
  410 414 422 435 446 452 453 454 457 461 470 474 476 489 490 493 501
  505 506 509 510 519 520 526 529 545 547 554 564 574 576 583 594
  603 614 618 619 625 627 628 631 632 633 634 635 636 641 642 644
  645 647 648 649 652 654 656 657 658 659 664
)

# Process each incident
for id in "${INCIDENTS[@]}"; do
  echo "Processing incident $id..."
  npm run generate-classifications -- --incidents="$id" --taxonomy="GMF" --output=gmf-generation.csv
done

echo "All incidents processed." 