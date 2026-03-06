// LinkedIn Industry Codes V2
// Source: https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2
// Used by HarvestAPI Apify actor as `industryIds` parameter

export interface IndustryOption {
    id: string;
    label: string;
    group: string;
}

export const LINKEDIN_INDUSTRIES: IndustryOption[] = [
    // Technology & Software
    { id: "4", label: "Software Development", group: "Technology" },
    { id: "96", label: "IT Services and IT Consulting", group: "Technology" },
    { id: "6", label: "Internet", group: "Technology" },
    { id: "3", label: "Computer Hardware Manufacturing", group: "Technology" },
    { id: "7", label: "Semiconductor Manufacturing", group: "Technology" },
    { id: "24", label: "Computers and Electronics Manufacturing", group: "Technology" },
    { id: "97", label: "Telecommunications", group: "Technology" },
    { id: "2900", label: "Technology Infrastructure Services", group: "Technology" },

    // Financial Services & Insurance
    { id: "43", label: "Financial Services", group: "Finance" },
    { id: "41", label: "Banking", group: "Finance" },
    { id: "42", label: "Insurance", group: "Finance" },
    { id: "129", label: "Capital Markets", group: "Finance" },
    { id: "45", label: "Investment Banking", group: "Finance" },
    { id: "46", label: "Investment Management", group: "Finance" },
    { id: "106", label: "Venture Capital and Private Equity", group: "Finance" },

    // Professional Services
    { id: "47", label: "Accounting", group: "Professional Services" },
    { id: "80", label: "Advertising Services", group: "Professional Services" },
    { id: "81", label: "Consulting Services", group: "Professional Services" },
    { id: "84", label: "Legal Services", group: "Professional Services" },
    { id: "82", label: "Research Services", group: "Professional Services" },
    { id: "85", label: "Market Research", group: "Professional Services" },
    { id: "50", label: "Design Services", group: "Professional Services" },
    { id: "104", label: "Staffing and Recruiting", group: "Professional Services" },

    // Healthcare
    { id: "14", label: "Hospitals and Health Care", group: "Healthcare" },
    { id: "13", label: "Medical Practices", group: "Healthcare" },
    { id: "15", label: "Pharmaceutical Manufacturing", group: "Healthcare" },
    { id: "17", label: "Medical Equipment Manufacturing", group: "Healthcare" },
    { id: "139", label: "Mental Health Care", group: "Healthcare" },

    // Manufacturing & Industry
    { id: "25", label: "Manufacturing", group: "Manufacturing" },
    { id: "53", label: "Motor Vehicle Manufacturing", group: "Manufacturing" },
    { id: "52", label: "Aviation and Aerospace", group: "Manufacturing" },
    { id: "54", label: "Chemical Manufacturing", group: "Manufacturing" },
    { id: "135", label: "Industrial Machinery Manufacturing", group: "Manufacturing" },

    // Real Estate & Construction
    { id: "44", label: "Real Estate", group: "Real Estate" },
    { id: "48", label: "Construction", group: "Real Estate" },

    // Retail & Wholesale
    { id: "22", label: "Retail Trade", group: "Retail" },
    { id: "27", label: "Wholesale Trade", group: "Retail" },
    { id: "16", label: "E-commerce", group: "Retail" },

    // Transportation & Logistics
    { id: "36", label: "Transportation, Logistics, and Warehousing", group: "Logistics" },

    // Education
    { id: "1999", label: "Education", group: "Education" },
    { id: "68", label: "Higher Education", group: "Education" },
    { id: "132", label: "E-Learning Providers", group: "Education" },

    // Energy & Utilities
    { id: "35", label: "Utilities", group: "Energy" },
    { id: "57", label: "Oil and Gas", group: "Energy" },
    { id: "1797", label: "Electric Power Generation", group: "Energy" },

    // Media & Entertainment
    { id: "28", label: "Entertainment Providers", group: "Media" },
    { id: "83", label: "Printing Services", group: "Media" },

    // Food & Hospitality
    { id: "31", label: "Hospitality", group: "Hospitality" },
    { id: "34", label: "Food and Beverage Services", group: "Hospitality" },
    { id: "23", label: "Food and Beverage Manufacturing", group: "Hospitality" },

    // Government & Non-profit
    { id: "75", label: "Government Administration", group: "Government" },
    { id: "100", label: "Non-profit Organizations", group: "Government" },

    // Agriculture
    { id: "201", label: "Farming, Ranching, Forestry", group: "Agriculture" },
];

// Group industries for optgroup rendering
export function getIndustryGroups(): { group: string; options: IndustryOption[] }[] {
    const groups = new Map<string, IndustryOption[]>();
    for (const industry of LINKEDIN_INDUSTRIES) {
        if (!groups.has(industry.group)) {
            groups.set(industry.group, []);
        }
        groups.get(industry.group)!.push(industry);
    }
    return Array.from(groups.entries()).map(([group, options]) => ({ group, options }));
}
