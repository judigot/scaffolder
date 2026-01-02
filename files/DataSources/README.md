# Data Sources Directory

This directory contains structured data sources that can be used with the `LOOP_FOLDERS` feature to generate documents across various industries and research fields.

## Available Data Sources

### 1. People
**Path:** `People/`

Contains comprehensive personal information for generating:
- Resumes and employee files
- Real estate listings (as property owners/agents)
- Legal contracts (as clients)
- Education certificates (as students)
- Finance invoices (as clients)
- Healthcare reports (as patients)
- Marketing proposals (as clients)

**Structure:** `/People/{person-name}/info.yaml`

### 2. Elements
**Path:** `Elements/`

Contains periodic table element data for generating:
- Element information cards
- Periodic table references
- Chemical property sheets
- Educational materials

**Structure:** `/Elements/{element-name}/info.yaml`

**Data Includes:**
- Atomic properties (number, mass, configuration)
- Physical properties (density, melting/boiling points)
- Chemical properties (electronegativity, oxidation states)
- Discovery information
- Uses and applications
- Safety notes
- Isotopes and allotropes

**Example Elements:**
- Hydrogen
- Carbon
- Oxygen
- Iron

### 3. Species
**Path:** `Species/`

Contains biological species data for generating:
- Species fact sheets
- Research databases
- Conservation reports
- Educational materials

**Structure:** `/Species/{scientific-name}/info.yaml`

**Data Includes:**
- Taxonomic classification (Kingdom, Phylum, Class, Order, Family, Genus)
- Common and scientific names
- Conservation status
- Physical characteristics
- Habitat and distribution
- Behavior and reproduction
- Threats and research notes
- DNA/genome information
- Related species

**Example Species:**
- Canis lupus (Gray Wolf)
- Panthera leo (Lion)
- Quercus robur (English Oak)

### 4. Ingredients
**Path:** `Ingredients/`

Contains chemical and food ingredient data for generating:
- Safety data sheets (SDS)
- Ingredient specifications
- Research documentation
- Quality control reports

**Structure:** `/Ingredients/{ingredient-name}/info.yaml`

**Data Includes:**
- Chemical formula and molecular weight
- CAS number
- Physical and chemical properties
- Uses and applications
- Health and safety information
- Storage requirements
- Research applications
- Nutritional information (for food ingredients)

**Example Ingredients:**
- Sodium Chloride (Table Salt)
- Ascorbic Acid (Vitamin C)

### 5. Experiments
**Path:** `Experiments/`

Contains laboratory experiment data for generating:
- Lab reports
- Research documentation
- Protocol references
- Experimental records

**Structure:** `/Experiments/{experiment-id}/info.yaml`

**Data Includes:**
- Experiment ID and title
- Researcher and institution information
- Objective and hypothesis
- Materials list
- Detailed protocol steps
- Experimental conditions
- Results and analysis
- Conclusions
- Research notes

**Example Experiments:**
- PCR Amplification experiments
- Acid-Base Titration experiments

## Using Data Sources

### In Project structure.yaml

All projects can reference data sources using the `--data-source` flag:

```yaml
LOOP_FOLDERS(output.html --data-source=/DataSources/People/**/info.yaml --template=./templates/template.txt)
```

### Data Source Patterns

- **People:** `/DataSources/People/**/info.yaml`
- **Elements:** `/DataSources/Elements/**/info.yaml`
- **Species:** `/DataSources/Species/**/info.yaml`
- **Ingredients:** `/DataSources/Ingredients/**/info.yaml`
- **Experiments:** `/DataSources/Experiments/**/info.yaml`

The `**` pattern matches any number of subdirectories, allowing flexible folder structures.

## Adding New Data Sources

To add a new data source:

1. Create a new folder in `DataSources/` (e.g., `DataSources/Compounds/`)
2. Create subfolders for each item (e.g., `DataSources/Compounds/water/`)
3. Add `info.yaml` files with structured data
4. Create projects that reference the new data source

## Research & Science Applications

These data sources support various research and science industries:

### Chemistry
- **Elements:** Periodic table references, element properties
- **Ingredients:** Chemical safety sheets, reagent specifications
- **Experiments:** Lab protocols, reaction documentation

### Biology
- **Species:** Taxonomic databases, conservation reports
- **Experiments:** Biological assays, research protocols

### Education
- **Elements:** Chemistry education materials
- **Species:** Biology teaching resources
- **Experiments:** Lab report templates

### Industry
- **Ingredients:** Quality control, safety documentation
- **Experiments:** Process validation, research records

## Best Practices

1. **Consistent Structure:** Use the same YAML structure for similar items
2. **Complete Data:** Include all relevant fields for your use case
3. **Scientific Accuracy:** Ensure data accuracy for research applications
4. **Regular Updates:** Keep data current, especially for safety information
5. **Documentation:** Document any custom fields or structures

## Future Data Sources

Potential additions:
- **Compounds/Molecules:** Chemical compounds with structures
- **Drugs/Medications:** Pharmaceutical data
- **Genes/Proteins:** Biological sequences
- **Equipment:** Laboratory equipment specifications
- **Samples:** Lab sample tracking
- **Research Papers:** Citation and metadata

