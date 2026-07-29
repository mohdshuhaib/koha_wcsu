-- Create Risala Table
CREATE TABLE IF NOT EXISTS public.risala (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR NOT NULL UNIQUE,
    risala_name VARCHAR NOT NULL,
    author VARCHAR,
    language VARCHAR,
    mushrif VARCHAR,
    department VARCHAR,
    year VARCHAR,
    section_no VARCHAR,
    status VARCHAR DEFAULT 'available'::character varying NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add Row Level Security (RLS) for risala
ALTER TABLE public.risala ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on risala" ON public.risala
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access on risala" ON public.risala
    FOR ALL USING (auth.role() = 'authenticated');

-- Create Reference Table
CREATE TABLE IF NOT EXISTS public.reference (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR NOT NULL UNIQUE,
    reference_name VARCHAR NOT NULL,
    author VARCHAR,
    language VARCHAR,
    price NUMERIC,
    publication VARCHAR,
    status VARCHAR DEFAULT 'available'::character varying NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add Row Level Security (RLS) for reference
ALTER TABLE public.reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on reference" ON public.reference
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access on reference" ON public.reference
    FOR ALL USING (auth.role() = 'authenticated');
