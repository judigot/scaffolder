# Sample Projects Using LOOP_FOLDERS

This directory contains sample projects demonstrating the `LOOP_FOLDERS` feature for generating documents across multiple industries.

## Unified Data Source

All projects now use a unified data source: `/People/**/info.yaml`

Each person in the `/People/` directory has a comprehensive `info.yaml` file containing all the data needed for all project types:
- Basic information (for resumes)
- Property information (for real estate listings)
- Client information (for contracts, invoices, proposals)
- Student information (for certificates)
- Patient information (for healthcare reports)

This allows you to generate multiple document types for the same person from a single data file.

## Available Projects

### 1. Real Estate Listings
**Path:** `Real-Estate-Listings/`

Generates HTML property listing pages from person data files.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `property` and `agent` sections
- Generates: `{address-street}-{address-city}.html`

**Required Data Sections:**
```yaml
property:
  title: "Beautiful Family Home"
  price: "450000"
  type: "Single Family Home"
  bedrooms: 4
  bathrooms: 2.5
  square-feet: 2500
  address-street: "123 Main St"
  address-city: "Springfield"
  address-state: "IL"
  address-zip: "62701"
  description: "Stunning home in quiet neighborhood..."
  features: "Garage, Fireplace, Hardwood Floors"
agent:
  name: "John Smith"
  phone: "555-1234"
  email: "john@realty.com"
```

### 2. Legal Contracts
**Path:** `Legal-Contracts/`

Generates legal contract documents from person data files.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `client`, `contract`, and `law-firm` sections
- Generates: `Contract-{client-company-name}-{contract-type}.docx`

**Example Data Structure:**
```yaml
client:
  name: "ABC Corporation"
  address: "456 Business Ave"
  city: "Chicago"
  state: "IL"
  zip: "60601"
  phone: "555-5678"
  email: "contact@abc.com"
contract:
  type: "Service Agreement"
  date: "2024-01-15"
  start-date: "2024-02-01"
  end-date: "2024-12-31"
  amount: "50000"
  scope: "Legal consultation services..."
  payment-terms: "Monthly installments"
law-firm:
  name: "Smith & Associates"
  address: "789 Legal Blvd"
  city: "Chicago"
  state: "IL"
  zip: "60602"
  phone: "555-9012"
  email: "info@smithlaw.com"
  representative: "Jane Smith, Esq."
```

### 3. Education Certificates
**Path:** `Education-Certificates/`

Generates professional certificates for students completing courses.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `student`, `course`, `instructor`, and `school` sections
- Generates: `{student-name}-{course-name}-Certificate.html`

**Example Data Structure:**
```yaml
student:
  name: "Sarah Johnson"
course:
  name: "Advanced Web Development"
  duration: "12 weeks"
  completion-date: "2024-03-15"
  grade: "A"
  description: "Comprehensive course covering modern web technologies..."
certificate:
  id: "CERT-2024-001"
instructor:
  name: "Dr. Michael Chen"
school:
  name: "Tech Academy"
  director: "Dr. Robert Williams"
```

### 4. Finance Invoices
**Path:** `Finance-Invoices/`

Generates professional invoices from person data files.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `invoice`, `client`, `company`, and `ship-to` sections
- Generates: `Invoice-{invoice-number}.html`

**Example Data Structure:**
```yaml
invoice:
  number: "INV-2024-001"
  date: "2024-01-15"
  due-date: "2024-02-15"
  terms: "Net 30"
  subtotal: "5000.00"
  tax-rate: "8.5"
  tax: "425.00"
  discount: "0.00"
  total: "5425.00"
  items: "Consulting Services - 40 hours @ $125/hr"
  payment-instructions: "Please remit payment via bank transfer..."
client:
  name: "XYZ Corporation"
  address: "123 Corporate Dr"
  city: "New York"
  state: "NY"
  zip: "10001"
company:
  name: "ABC Services Inc"
  address: "456 Service St"
  city: "New York"
  state: "NY"
  zip: "10002"
  phone: "555-0001"
  email: "billing@abcservices.com"
```

### 5. Healthcare Reports
**Path:** `Healthcare-Reports/`

Generates patient medical reports from person data files.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `patient`, `visit`, `vitals`, `examination`, `diagnosis`, `treatment`, `follow-up`, `physician`, and `clinic` sections
- Generates: `Patient-Report-{patient-id}-{visit-date}.html`

**Example Data Structure:**
```yaml
patient:
  id: "PAT-001"
  name: "John Doe"
  date-of-birth: "1980-05-15"
  gender: "Male"
  phone: "555-1234"
  emergency-contact: "Jane Doe - 555-5678"
visit:
  date: "2024-01-20"
  time: "10:00 AM"
  chief-complaint: "Chest pain and shortness of breath"
vitals:
  blood-pressure: "120/80"
  heart-rate: "72"
  temperature: "98.6"
  weight: "180"
  height: "72"
  oxygen-saturation: "98"
examination:
  notes: "Patient presents with stable vital signs..."
diagnosis:
  primary: "Hypertension, controlled"
  notes: "Continue current medication regimen..."
treatment:
  prescription: "Lisinopril 10mg daily"
  instructions: "Take with food, monitor blood pressure weekly"
follow-up:
  instructions: "Return in 3 months for follow-up"
  next-appointment: "2024-04-20"
physician:
  name: "Dr. Sarah Martinez"
  license: "MD-12345"
clinic:
  name: "City Medical Center"
```

### 6. Marketing Proposals
**Path:** `Marketing-Proposals/`

Generates professional marketing proposals from person data files.

**Usage:**
- Uses data from `/People/**/info.yaml`
- Each person's file should contain `client`, `proposal`, `pricing`, and `agency` sections
- Generates: `Proposal-{client-company-name}-{proposal-date}.html`

**Example Data Structure:**
```yaml
client:
  company-name: "TechStart Inc"
  contact-name: "Mike Johnson"
  email: "mike@techstart.com"
  phone: "555-1111"
  address: "789 Innovation Way"
  city: "San Francisco"
  state: "CA"
  industry: "Technology"
proposal:
  title: "Digital Marketing Campaign"
  date: "2024-01-15"
  validity: "30"
  executive-summary: "Comprehensive digital marketing strategy..."
  services: "SEO Optimization, Social Media Management, Content Creation"
  timeline: "Phase 1: Weeks 1-4, Phase 2: Weeks 5-8..."
  why-choose-us: "10+ years experience, proven track record..."
  next-steps: "Review proposal, schedule meeting, sign agreement"
pricing:
  base-price: "15000"
  additional: "5000"
  tax: "1700"
  total: "21700"
  payment-terms: "50% upfront, 50% on completion"
agency:
  name: "Creative Marketing Solutions"
  representative: "Lisa Anderson"
```

## How to Use

1. **Set up your data structure:**
   - Create person folders in `/People/` directory (e.g., `/People/john-doe/`, `/People/jane-smith/`)
   - Add `info.yaml` files in each person's folder with all relevant data sections
   - Each person can have data for multiple project types in the same file

2. **Run the project:**
   - Select the project from the Projects directory
   - The system will automatically find all `info.yaml` files in `/People/**/`
   - Generate personalized documents for each person

3. **Customize templates:**
   - Edit the template files in each project's `templates/` directory
   - Use `[[USE_DATA(property.path)]]` to access data values
   - Use `<@@>placeholder</@@>` for filename placeholders

## Unified Data Source

All projects use the same data source pattern: `/People/**/info.yaml`

This means:
- One person = One data file
- Each person's file contains all data sections needed for different document types
- You can generate multiple document types for the same person
- The `**` pattern matches any number of subdirectories, allowing flexible folder structures

## Data File Structure

Each person's `info.yaml` file can contain these sections:
- `basic-info` - Personal information (for resumes)
- `property` - Property details (for real estate listings)
- `client` - Client information (for contracts, invoices, proposals)
- `contract` - Contract terms (for legal contracts)
- `law-firm` - Law firm details (for legal contracts)
- `student` - Student information (for certificates)
- `course` - Course details (for certificates)
- `instructor` - Instructor information (for certificates)
- `school` - School information (for certificates)
- `invoice` - Invoice details (for invoices)
- `company` - Company information (for invoices)
- `ship-to` - Shipping address (for invoices)
- `patient` - Patient information (for healthcare reports)
- `visit` - Visit details (for healthcare reports)
- `vitals` - Vital signs (for healthcare reports)
- `examination` - Examination notes (for healthcare reports)
- `diagnosis` - Diagnosis information (for healthcare reports)
- `treatment` - Treatment details (for healthcare reports)
- `follow-up` - Follow-up instructions (for healthcare reports)
- `physician` - Physician information (for healthcare reports)
- `clinic` - Clinic information (for healthcare reports)
- `proposal` - Proposal details (for marketing proposals)
- `pricing` - Pricing information (for marketing proposals)
- `agency` - Agency information (for marketing proposals)

## Template Features

All templates support:
- **USE_DATA**: Access any property from the YAML data file
- **Nested Properties**: Use dot notation (e.g., `property.address-city`)
- **Array Access**: Use indexed notation (e.g., `items[0]`)
- **Dynamic Filenames**: Use placeholders in structure.yaml filenames

## Notes

- All generated files are HTML-based and can be converted to PDF using browser print functionality
- Templates use inline CSS for portability
- Data files must be valid YAML format
- Missing data properties will result in empty strings in the output

