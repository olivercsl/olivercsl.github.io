/**
 * Time zone helpers built entirely on the browser's Intl API.
 *
 * No dependency and no bundled tzdata: Intl already carries the IANA database,
 * so DST rules stay correct as countries change them, and we ship none of it.
 *
 * The awkward part of any converter is going the "wrong" way — turning a wall
 * clock reading in some zone back into a UTC instant. Intl only formats
 * forwards, so wallTimeToInstant() inverts it by iteration. See the note there.
 */

export interface City {
  /** City name as people search for it. */
  c: string;
  /** ISO 3166-1 alpha-2. Country name and flag are derived, not stored. */
  cc: string;
  /** IANA zone id. */
  z: string;
  /** Capital of its country. Ranked first when someone searches the country. */
  cap?: true;
  /** Other names this city answers to: former names, or the region it heads. */
  alt?: string[];
}

/**
 * Curated list, because IANA ids are not city names people type. "Boston" is
 * America/New_York; "Munich" is Europe/Berlin. Any zone not listed here is
 * still reachable: searchCities() falls back to the full Intl zone list.
 *
 * Every country with a time zone has at least its capital here, so searching a
 * country name always returns something. Without that, "cyprus" found nothing:
 * no curated city carried the country, and the IANA fallback could not help
 * either, since the zone is Asia/Nicosia and contains no trace of "cyprus".
 */
export const CITIES: City[] = [
  // North America
  { c: 'New York', cc: 'US', z: 'America/New_York' },
  { c: 'Boston', cc: 'US', z: 'America/New_York' },
  { c: 'Washington DC', cc: 'US', z: 'America/New_York', cap: true },
  { c: 'Philadelphia', cc: 'US', z: 'America/New_York' },
  { c: 'Atlanta', cc: 'US', z: 'America/New_York' },
  { c: 'Miami', cc: 'US', z: 'America/New_York' },
  { c: 'Detroit', cc: 'US', z: 'America/Detroit' },
  { c: 'Chicago', cc: 'US', z: 'America/Chicago' },
  { c: 'Dallas', cc: 'US', z: 'America/Chicago' },
  { c: 'Houston', cc: 'US', z: 'America/Chicago' },
  { c: 'Austin', cc: 'US', z: 'America/Chicago' },
  { c: 'Minneapolis', cc: 'US', z: 'America/Chicago' },
  { c: 'Denver', cc: 'US', z: 'America/Denver' },
  { c: 'Salt Lake City', cc: 'US', z: 'America/Denver' },
  { c: 'Phoenix', cc: 'US', z: 'America/Phoenix' },
  { c: 'Los Angeles', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'San Francisco', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'San Diego', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Seattle', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Portland', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Las Vegas', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Anchorage', cc: 'US', z: 'America/Anchorage' },
  { c: 'Honolulu', cc: 'US', z: 'Pacific/Honolulu' },
  { c: 'Toronto', cc: 'CA', z: 'America/Toronto' },
  { c: 'Ottawa', cc: 'CA', z: 'America/Toronto', cap: true },
  { c: 'Montreal', cc: 'CA', z: 'America/Toronto' },
  { c: 'Vancouver', cc: 'CA', z: 'America/Vancouver' },
  { c: 'Calgary', cc: 'CA', z: 'America/Edmonton' },
  { c: 'Winnipeg', cc: 'CA', z: 'America/Winnipeg' },
  { c: 'Halifax', cc: 'CA', z: 'America/Halifax' },
  { c: 'Mexico City', cc: 'MX', z: 'America/Mexico_City', cap: true },
  { c: 'Monterrey', cc: 'MX', z: 'America/Monterrey' },
  { c: 'Tijuana', cc: 'MX', z: 'America/Tijuana' },
  { c: 'Panama City', cc: 'PA', z: 'America/Panama', cap: true },
  { c: 'San José', cc: 'CR', z: 'America/Costa_Rica', cap: true },
  { c: 'Havana', cc: 'CU', z: 'America/Havana', cap: true },
  { c: 'Kingston', cc: 'JM', z: 'America/Jamaica', cap: true },

  // South America
  { c: 'São Paulo', cc: 'BR', z: 'America/Sao_Paulo' },
  { c: 'Rio de Janeiro', cc: 'BR', z: 'America/Sao_Paulo' },
  { c: 'Brasília', cc: 'BR', z: 'America/Sao_Paulo', cap: true },
  { c: 'Buenos Aires', cc: 'AR', z: 'America/Argentina/Buenos_Aires', cap: true },
  { c: 'Santiago', cc: 'CL', z: 'America/Santiago', cap: true },
  { c: 'Lima', cc: 'PE', z: 'America/Lima', cap: true },
  { c: 'Bogotá', cc: 'CO', z: 'America/Bogota', cap: true },
  { c: 'Caracas', cc: 'VE', z: 'America/Caracas', cap: true },
  { c: 'Quito', cc: 'EC', z: 'America/Guayaquil', cap: true },
  { c: 'Montevideo', cc: 'UY', z: 'America/Montevideo', cap: true },
  { c: 'La Paz', cc: 'BO', z: 'America/La_Paz', cap: true },

  // Europe
  { c: 'London', cc: 'GB', z: 'Europe/London', cap: true },
  { c: 'Manchester', cc: 'GB', z: 'Europe/London' },
  { c: 'Edinburgh', cc: 'GB', z: 'Europe/London', alt: ['scotland'] },
  { c: 'Cardiff', cc: 'GB', z: 'Europe/London', alt: ['wales'] },
  { c: 'Belfast', cc: 'GB', z: 'Europe/London', alt: ['northern ireland'] },
  { c: 'Dublin', cc: 'IE', z: 'Europe/Dublin', cap: true },
  { c: 'Paris', cc: 'FR', z: 'Europe/Paris', cap: true },
  { c: 'Lyon', cc: 'FR', z: 'Europe/Paris' },
  { c: 'Marseille', cc: 'FR', z: 'Europe/Paris' },
  { c: 'Berlin', cc: 'DE', z: 'Europe/Berlin', cap: true },
  { c: 'Munich', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Frankfurt', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Hamburg', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Amsterdam', cc: 'NL', z: 'Europe/Amsterdam', cap: true },
  { c: 'Rotterdam', cc: 'NL', z: 'Europe/Amsterdam' },
  { c: 'Brussels', cc: 'BE', z: 'Europe/Brussels', cap: true },
  { c: 'Luxembourg', cc: 'LU', z: 'Europe/Luxembourg', cap: true },
  { c: 'Zurich', cc: 'CH', z: 'Europe/Zurich' },
  { c: 'Geneva', cc: 'CH', z: 'Europe/Zurich' },
  { c: 'Vienna', cc: 'AT', z: 'Europe/Vienna', cap: true },
  { c: 'Madrid', cc: 'ES', z: 'Europe/Madrid', cap: true },
  { c: 'Barcelona', cc: 'ES', z: 'Europe/Madrid' },
  { c: 'Lisbon', cc: 'PT', z: 'Europe/Lisbon', cap: true },
  { c: 'Rome', cc: 'IT', z: 'Europe/Rome', cap: true },
  { c: 'Milan', cc: 'IT', z: 'Europe/Rome' },
  { c: 'Copenhagen', cc: 'DK', z: 'Europe/Copenhagen', cap: true },
  { c: 'Stockholm', cc: 'SE', z: 'Europe/Stockholm', cap: true },
  { c: 'Oslo', cc: 'NO', z: 'Europe/Oslo', cap: true },
  { c: 'Helsinki', cc: 'FI', z: 'Europe/Helsinki', cap: true },
  { c: 'Reykjavik', cc: 'IS', z: 'Atlantic/Reykjavik', cap: true },
  { c: 'Warsaw', cc: 'PL', z: 'Europe/Warsaw', cap: true },
  { c: 'Prague', cc: 'CZ', z: 'Europe/Prague', cap: true },
  { c: 'Budapest', cc: 'HU', z: 'Europe/Budapest', cap: true },
  { c: 'Bucharest', cc: 'RO', z: 'Europe/Bucharest', cap: true },
  { c: 'Sofia', cc: 'BG', z: 'Europe/Sofia', cap: true },
  { c: 'Athens', cc: 'GR', z: 'Europe/Athens', cap: true },
  { c: 'Zagreb', cc: 'HR', z: 'Europe/Zagreb', cap: true },
  { c: 'Belgrade', cc: 'RS', z: 'Europe/Belgrade', cap: true },
  { c: 'Kyiv', cc: 'UA', z: 'Europe/Kyiv', cap: true, alt: ['kiev'] },
  { c: 'Moscow', cc: 'RU', z: 'Europe/Moscow', cap: true },
  { c: 'Saint Petersburg', cc: 'RU', z: 'Europe/Moscow' },
  { c: 'Istanbul', cc: 'TR', z: 'Europe/Istanbul', alt: ['constantinople'] },

  // Middle East
  { c: 'Dubai', cc: 'AE', z: 'Asia/Dubai' },
  { c: 'Abu Dhabi', cc: 'AE', z: 'Asia/Dubai', cap: true },
  { c: 'Doha', cc: 'QA', z: 'Asia/Qatar', cap: true },
  { c: 'Riyadh', cc: 'SA', z: 'Asia/Riyadh', cap: true },
  { c: 'Jeddah', cc: 'SA', z: 'Asia/Riyadh' },
  { c: 'Kuwait City', cc: 'KW', z: 'Asia/Kuwait', cap: true },
  { c: 'Manama', cc: 'BH', z: 'Asia/Bahrain', cap: true },
  { c: 'Muscat', cc: 'OM', z: 'Asia/Muscat', cap: true },
  { c: 'Tel Aviv', cc: 'IL', z: 'Asia/Jerusalem' },
  { c: 'Jerusalem', cc: 'IL', z: 'Asia/Jerusalem', cap: true },
  { c: 'Amman', cc: 'JO', z: 'Asia/Amman', cap: true },
  { c: 'Beirut', cc: 'LB', z: 'Asia/Beirut', cap: true },
  { c: 'Baghdad', cc: 'IQ', z: 'Asia/Baghdad', cap: true },
  { c: 'Tehran', cc: 'IR', z: 'Asia/Tehran', cap: true },

  // Africa
  { c: 'Cairo', cc: 'EG', z: 'Africa/Cairo', cap: true },
  { c: 'Casablanca', cc: 'MA', z: 'Africa/Casablanca' },
  { c: 'Lagos', cc: 'NG', z: 'Africa/Lagos' },
  { c: 'Accra', cc: 'GH', z: 'Africa/Accra', cap: true },
  { c: 'Nairobi', cc: 'KE', z: 'Africa/Nairobi', cap: true },
  { c: 'Addis Ababa', cc: 'ET', z: 'Africa/Addis_Ababa', cap: true },
  { c: 'Dar es Salaam', cc: 'TZ', z: 'Africa/Dar_es_Salaam' },
  { c: 'Johannesburg', cc: 'ZA', z: 'Africa/Johannesburg' },
  { c: 'Cape Town', cc: 'ZA', z: 'Africa/Johannesburg' },
  { c: 'Tunis', cc: 'TN', z: 'Africa/Tunis', cap: true },
  { c: 'Algiers', cc: 'DZ', z: 'Africa/Algiers', cap: true },

  // South & Central Asia
  { c: 'Mumbai', cc: 'IN', z: 'Asia/Kolkata', alt: ['bombay'] },
  { c: 'Delhi', cc: 'IN', z: 'Asia/Kolkata', cap: true },
  { c: 'Bangalore', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Hyderabad', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Chennai', cc: 'IN', z: 'Asia/Kolkata', alt: ['madras'] },
  { c: 'Kolkata', cc: 'IN', z: 'Asia/Kolkata', alt: ['calcutta'] },
  { c: 'Pune', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Karachi', cc: 'PK', z: 'Asia/Karachi' },
  { c: 'Lahore', cc: 'PK', z: 'Asia/Karachi' },
  { c: 'Islamabad', cc: 'PK', z: 'Asia/Karachi', cap: true },
  { c: 'Dhaka', cc: 'BD', z: 'Asia/Dhaka', cap: true },
  { c: 'Colombo', cc: 'LK', z: 'Asia/Colombo', cap: true },
  { c: 'Kathmandu', cc: 'NP', z: 'Asia/Kathmandu', cap: true },
  { c: 'Tashkent', cc: 'UZ', z: 'Asia/Tashkent', cap: true },
  { c: 'Almaty', cc: 'KZ', z: 'Asia/Almaty', alt: ['alma ata'] },

  // East & Southeast Asia
  { c: 'Hong Kong', cc: 'HK', z: 'Asia/Hong_Kong' },
  { c: 'Macau', cc: 'MO', z: 'Asia/Macau' },
  { c: 'Beijing', cc: 'CN', z: 'Asia/Shanghai', cap: true, alt: ['peking'] },
  { c: 'Shanghai', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Shenzhen', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Guangzhou', cc: 'CN', z: 'Asia/Shanghai', alt: ['canton'] },
  { c: 'Chengdu', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Taipei', cc: 'TW', z: 'Asia/Taipei', cap: true },
  { c: 'Tokyo', cc: 'JP', z: 'Asia/Tokyo', cap: true },
  { c: 'Osaka', cc: 'JP', z: 'Asia/Tokyo' },
  { c: 'Seoul', cc: 'KR', z: 'Asia/Seoul', cap: true },
  { c: 'Singapore', cc: 'SG', z: 'Asia/Singapore', cap: true },
  { c: 'Kuala Lumpur', cc: 'MY', z: 'Asia/Kuala_Lumpur', cap: true },
  { c: 'Jakarta', cc: 'ID', z: 'Asia/Jakarta', cap: true },
  { c: 'Bali', cc: 'ID', z: 'Asia/Makassar' },
  { c: 'Bangkok', cc: 'TH', z: 'Asia/Bangkok', cap: true },
  { c: 'Hanoi', cc: 'VN', z: 'Asia/Ho_Chi_Minh', cap: true },
  { c: 'Ho Chi Minh City', cc: 'VN', z: 'Asia/Ho_Chi_Minh', alt: ['saigon'] },
  { c: 'Manila', cc: 'PH', z: 'Asia/Manila', cap: true },
  { c: 'Phnom Penh', cc: 'KH', z: 'Asia/Phnom_Penh', cap: true },
  { c: 'Yangon', cc: 'MM', z: 'Asia/Yangon', alt: ['rangoon'] },
  { c: 'Ulaanbaatar', cc: 'MN', z: 'Asia/Ulaanbaatar', cap: true, alt: ['ulan bator'] },

  // Oceania
  { c: 'Sydney', cc: 'AU', z: 'Australia/Sydney' },
  { c: 'Melbourne', cc: 'AU', z: 'Australia/Melbourne' },
  { c: 'Canberra', cc: 'AU', z: 'Australia/Sydney', cap: true },
  { c: 'Brisbane', cc: 'AU', z: 'Australia/Brisbane' },
  { c: 'Perth', cc: 'AU', z: 'Australia/Perth' },
  { c: 'Adelaide', cc: 'AU', z: 'Australia/Adelaide' },
  { c: 'Hobart', cc: 'AU', z: 'Australia/Hobart' },
  { c: 'Darwin', cc: 'AU', z: 'Australia/Darwin' },
  { c: 'Auckland', cc: 'NZ', z: 'Pacific/Auckland' },
  { c: 'Wellington', cc: 'NZ', z: 'Pacific/Auckland', cap: true },
  { c: 'Christchurch', cc: 'NZ', z: 'Pacific/Auckland' },
  { c: 'Suva', cc: 'FJ', z: 'Pacific/Fiji', cap: true },
  { c: 'Port Moresby', cc: 'PG', z: 'Pacific/Port_Moresby', cap: true },
  { c: 'Honiara', cc: 'SB', z: 'Pacific/Guadalcanal', cap: true },
  { c: 'Nouméa', cc: 'NC', z: 'Pacific/Noumea', cap: true },
  { c: 'Papeete', cc: 'PF', z: 'Pacific/Tahiti', cap: true },
  { c: 'Guam', cc: 'GU', z: 'Pacific/Guam' },

  { c: 'UTC', cc: '', z: 'UTC' },
  // Capitals, so searching any country name finds at least one city there.
  // Europe
  { c: 'Andorra la Vella', cc: 'AD', z: 'Europe/Andorra', cap: true },
  { c: 'Ankara', cc: 'TR', z: 'Europe/Istanbul', cap: true },
  { c: 'Bern', cc: 'CH', z: 'Europe/Zurich', cap: true },
  { c: 'Bratislava', cc: 'SK', z: 'Europe/Bratislava', cap: true },
  { c: 'Chisinau', cc: 'MD', z: 'Europe/Chisinau', cap: true },
  { c: 'Douglas', cc: 'IM', z: 'Europe/Isle_of_Man', cap: true },
  { c: 'Gibraltar', cc: 'GI', z: 'Europe/Gibraltar', cap: true },
  { c: 'Ljubljana', cc: 'SI', z: 'Europe/Ljubljana', cap: true },
  { c: 'Mariehamn', cc: 'AX', z: 'Europe/Mariehamn', cap: true },
  { c: 'Minsk', cc: 'BY', z: 'Europe/Minsk', cap: true },
  { c: 'Monaco', cc: 'MC', z: 'Europe/Monaco', cap: true },
  { c: 'Podgorica', cc: 'ME', z: 'Europe/Podgorica', cap: true },
  { c: 'Riga', cc: 'LV', z: 'Europe/Riga', cap: true },
  { c: 'San Marino', cc: 'SM', z: 'Europe/San_Marino', cap: true },
  { c: 'Sarajevo', cc: 'BA', z: 'Europe/Sarajevo', cap: true },
  { c: 'Skopje', cc: 'MK', z: 'Europe/Skopje', cap: true },
  { c: 'St Helier', cc: 'JE', z: 'Europe/Jersey', cap: true },
  { c: 'St Peter Port', cc: 'GG', z: 'Europe/Guernsey', cap: true },
  { c: 'Tallinn', cc: 'EE', z: 'Europe/Tallinn', cap: true },
  { c: 'Tirana', cc: 'AL', z: 'Europe/Tirane', cap: true },
  { c: 'Vaduz', cc: 'LI', z: 'Europe/Vaduz', cap: true },
  { c: 'Valletta', cc: 'MT', z: 'Europe/Malta', cap: true },
  { c: 'Vatican City', cc: 'VA', z: 'Europe/Vatican', cap: true },
  { c: 'Vilnius', cc: 'LT', z: 'Europe/Vilnius', cap: true },
  // Asia and the Middle East
  { c: 'Ashgabat', cc: 'TM', z: 'Asia/Ashgabat', cap: true },
  { c: 'Astana', cc: 'KZ', z: 'Asia/Almaty', cap: true },
  { c: 'Baku', cc: 'AZ', z: 'Asia/Baku', cap: true },
  { c: 'Bandar Seri Begawan', cc: 'BN', z: 'Asia/Brunei', cap: true },
  { c: 'Bishkek', cc: 'KG', z: 'Asia/Bishkek', cap: true },
  { c: 'Damascus', cc: 'SY', z: 'Asia/Damascus', cap: true },
  { c: 'Dili', cc: 'TL', z: 'Asia/Dili', cap: true },
  { c: 'Dushanbe', cc: 'TJ', z: 'Asia/Dushanbe', cap: true },
  { c: 'Gaza', cc: 'PS', z: 'Asia/Gaza' },
  { c: 'Kabul', cc: 'AF', z: 'Asia/Kabul', cap: true },
  { c: 'Naypyidaw', cc: 'MM', z: 'Asia/Yangon', cap: true },
  { c: 'Nicosia', cc: 'CY', z: 'Asia/Nicosia', cap: true },
  { c: 'Pyongyang', cc: 'KP', z: 'Asia/Pyongyang', cap: true },
  { c: 'Ramallah', cc: 'PS', z: 'Asia/Hebron', cap: true },
  { c: 'Sanaa', cc: 'YE', z: 'Asia/Aden', cap: true },
  { c: 'Tbilisi', cc: 'GE', z: 'Asia/Tbilisi', cap: true },
  { c: 'Thimphu', cc: 'BT', z: 'Asia/Thimphu', cap: true },
  { c: 'Vientiane', cc: 'LA', z: 'Asia/Vientiane', cap: true },
  { c: 'Yerevan', cc: 'AM', z: 'Asia/Yerevan', cap: true },
  // Africa
  { c: 'Abidjan', cc: 'CI', z: 'Africa/Abidjan' },
  { c: 'Abuja', cc: 'NG', z: 'Africa/Lagos', cap: true },
  { c: 'Asmara', cc: 'ER', z: 'Africa/Asmera', cap: true, alt: ['asmera'] },
  { c: 'Bamako', cc: 'ML', z: 'Africa/Bamako', cap: true },
  { c: 'Bangui', cc: 'CF', z: 'Africa/Bangui', cap: true },
  { c: 'Banjul', cc: 'GM', z: 'Africa/Banjul', cap: true },
  { c: 'Bissau', cc: 'GW', z: 'Africa/Bissau', cap: true },
  { c: 'Blantyre', cc: 'MW', z: 'Africa/Blantyre' },
  { c: 'Brazzaville', cc: 'CG', z: 'Africa/Brazzaville', cap: true },
  { c: 'Bujumbura', cc: 'BI', z: 'Africa/Bujumbura' },
  { c: 'Conakry', cc: 'GN', z: 'Africa/Conakry', cap: true },
  { c: 'Cotonou', cc: 'BJ', z: 'Africa/Porto-Novo' },
  { c: 'Dakar', cc: 'SN', z: 'Africa/Dakar', cap: true },
  { c: 'Djibouti', cc: 'DJ', z: 'Africa/Djibouti', cap: true },
  { c: 'Dodoma', cc: 'TZ', z: 'Africa/Dar_es_Salaam', cap: true },
  { c: 'Douala', cc: 'CM', z: 'Africa/Douala' },
  { c: 'Freetown', cc: 'SL', z: 'Africa/Freetown', cap: true },
  { c: 'Gaborone', cc: 'BW', z: 'Africa/Gaborone', cap: true },
  { c: 'Gitega', cc: 'BI', z: 'Africa/Bujumbura', cap: true },
  { c: 'Harare', cc: 'ZW', z: 'Africa/Harare', cap: true },
  { c: 'Juba', cc: 'SS', z: 'Africa/Juba', cap: true },
  { c: 'Kampala', cc: 'UG', z: 'Africa/Kampala', cap: true },
  { c: 'Khartoum', cc: 'SD', z: 'Africa/Khartoum', cap: true },
  { c: 'Kigali', cc: 'RW', z: 'Africa/Kigali', cap: true },
  { c: 'Kinshasa', cc: 'CD', z: 'Africa/Kinshasa', cap: true },
  { c: 'Laayoune', cc: 'EH', z: 'Africa/El_Aaiun', cap: true },
  { c: 'Libreville', cc: 'GA', z: 'Africa/Libreville', cap: true },
  { c: 'Lilongwe', cc: 'MW', z: 'Africa/Blantyre', cap: true },
  { c: 'Lome', cc: 'TG', z: 'Africa/Lome', cap: true },
  { c: 'Luanda', cc: 'AO', z: 'Africa/Luanda', cap: true },
  { c: 'Lubumbashi', cc: 'CD', z: 'Africa/Lubumbashi' },
  { c: 'Lusaka', cc: 'ZM', z: 'Africa/Lusaka', cap: true },
  { c: 'Malabo', cc: 'GQ', z: 'Africa/Malabo', cap: true },
  { c: 'Maputo', cc: 'MZ', z: 'Africa/Maputo', cap: true },
  { c: 'Maseru', cc: 'LS', z: 'Africa/Maseru', cap: true },
  { c: 'Mbabane', cc: 'SZ', z: 'Africa/Mbabane', cap: true },
  { c: 'Mogadishu', cc: 'SO', z: 'Africa/Mogadishu', cap: true },
  { c: 'Monrovia', cc: 'LR', z: 'Africa/Monrovia', cap: true },
  { c: 'Ndjamena', cc: 'TD', z: 'Africa/Ndjamena', cap: true },
  { c: 'Niamey', cc: 'NE', z: 'Africa/Niamey', cap: true },
  { c: 'Nouakchott', cc: 'MR', z: 'Africa/Nouakchott', cap: true },
  { c: 'Ouagadougou', cc: 'BF', z: 'Africa/Ouagadougou', cap: true },
  { c: 'Porto-Novo', cc: 'BJ', z: 'Africa/Porto-Novo', cap: true },
  { c: 'Pretoria', cc: 'ZA', z: 'Africa/Johannesburg', cap: true },
  { c: 'Rabat', cc: 'MA', z: 'Africa/Casablanca', cap: true },
  { c: 'Sao Tome', cc: 'ST', z: 'Africa/Sao_Tome', cap: true },
  { c: 'Tripoli', cc: 'LY', z: 'Africa/Tripoli', cap: true },
  { c: 'Windhoek', cc: 'NA', z: 'Africa/Windhoek', cap: true },
  { c: 'Yamoussoukro', cc: 'CI', z: 'Africa/Abidjan', cap: true },
  { c: 'Yaounde', cc: 'CM', z: 'Africa/Douala', cap: true },
  // The Americas and the Caribbean
  { c: 'Asuncion', cc: 'PY', z: 'America/Asuncion', cap: true },
  { c: 'Basse-Terre', cc: 'GP', z: 'America/Guadeloupe', cap: true },
  { c: 'Basseterre', cc: 'KN', z: 'America/St_Kitts', cap: true },
  { c: 'Belmopan', cc: 'BZ', z: 'America/Belize', cap: true },
  { c: 'Brades', cc: 'MS', z: 'America/Montserrat', cap: true },
  { c: 'Bridgetown', cc: 'BB', z: 'America/Barbados', cap: true },
  { c: 'Castries', cc: 'LC', z: 'America/St_Lucia', cap: true },
  { c: 'Cayenne', cc: 'GF', z: 'America/Cayenne', cap: true },
  { c: 'Charlotte Amalie', cc: 'VI', z: 'America/St_Thomas', cap: true },
  { c: 'Cockburn Town', cc: 'TC', z: 'America/Grand_Turk', cap: true },
  { c: 'Fort-de-France', cc: 'MQ', z: 'America/Martinique', cap: true },
  { c: 'George Town', cc: 'KY', z: 'America/Cayman', cap: true },
  { c: 'Georgetown', cc: 'GY', z: 'America/Guyana', cap: true },
  { c: 'Guatemala City', cc: 'GT', z: 'America/Guatemala', cap: true },
  { c: 'Gustavia', cc: 'BL', z: 'America/St_Barthelemy', cap: true },
  { c: 'Kingstown', cc: 'VC', z: 'America/St_Vincent', cap: true },
  { c: 'Kralendijk', cc: 'BQ', z: 'America/Kralendijk', cap: true },
  { c: 'Managua', cc: 'NI', z: 'America/Managua', cap: true },
  { c: 'Marigot', cc: 'MF', z: 'America/Marigot', cap: true },
  { c: 'Nassau', cc: 'BS', z: 'America/Nassau', cap: true },
  { c: 'Nuuk', cc: 'GL', z: 'America/Godthab', cap: true, alt: ['godthab'] },
  { c: 'Oranjestad', cc: 'AW', z: 'America/Aruba', cap: true },
  { c: 'Paramaribo', cc: 'SR', z: 'America/Paramaribo', cap: true },
  { c: 'Philipsburg', cc: 'SX', z: 'America/Lower_Princes', cap: true },
  { c: 'Port of Spain', cc: 'TT', z: 'America/Port_of_Spain', cap: true },
  { c: 'Port-au-Prince', cc: 'HT', z: 'America/Port-au-Prince', cap: true },
  { c: 'Road Town', cc: 'VG', z: 'America/Tortola', cap: true },
  { c: 'Roseau', cc: 'DM', z: 'America/Dominica', cap: true },
  { c: 'Saint-Pierre', cc: 'PM', z: 'America/Miquelon', cap: true },
  { c: 'San Juan', cc: 'PR', z: 'America/Puerto_Rico', cap: true },
  { c: 'San Salvador', cc: 'SV', z: 'America/El_Salvador', cap: true },
  { c: 'Santo Domingo', cc: 'DO', z: 'America/Santo_Domingo', cap: true },
  { c: 'St Georges', cc: 'GD', z: 'America/Grenada', cap: true },
  { c: 'St Johns', cc: 'AG', z: 'America/Antigua', cap: true },
  { c: 'Sucre', cc: 'BO', z: 'America/La_Paz', cap: true },
  { c: 'Tegucigalpa', cc: 'HN', z: 'America/Tegucigalpa', cap: true },
  { c: 'The Valley', cc: 'AI', z: 'America/Anguilla', cap: true },
  { c: 'Willemstad', cc: 'CW', z: 'America/Curacao', cap: true },
  // Atlantic
  { c: 'Hamilton', cc: 'BM', z: 'Atlantic/Bermuda', cap: true },
  { c: 'Jamestown', cc: 'SH', z: 'Atlantic/St_Helena', cap: true },
  { c: 'Praia', cc: 'CV', z: 'Atlantic/Cape_Verde', cap: true },
  { c: 'Stanley', cc: 'FK', z: 'Atlantic/Stanley', cap: true },
  { c: 'Torshavn', cc: 'FO', z: 'Atlantic/Faeroe', cap: true },
  // Indian Ocean
  { c: 'Antananarivo', cc: 'MG', z: 'Indian/Antananarivo', cap: true },
  { c: 'Diego Garcia', cc: 'IO', z: 'Indian/Chagos', cap: true },
  { c: 'Flying Fish Cove', cc: 'CX', z: 'Indian/Christmas', cap: true },
  { c: 'Male', cc: 'MV', z: 'Indian/Maldives', cap: true },
  { c: 'Mamoudzou', cc: 'YT', z: 'Indian/Mayotte', cap: true },
  { c: 'Moroni', cc: 'KM', z: 'Indian/Comoro', cap: true },
  { c: 'Port Louis', cc: 'MU', z: 'Indian/Mauritius', cap: true },
  { c: 'Saint-Denis', cc: 'RE', z: 'Indian/Reunion', cap: true },
  { c: 'Victoria', cc: 'SC', z: 'Indian/Mahe', cap: true },
  { c: 'West Island', cc: 'CC', z: 'Indian/Cocos', cap: true },
  // Pacific
  { c: 'Adamstown', cc: 'PN', z: 'Pacific/Pitcairn', cap: true },
  { c: 'Alofi', cc: 'NU', z: 'Pacific/Niue', cap: true },
  { c: 'Apia', cc: 'WS', z: 'Pacific/Apia', cap: true },
  { c: 'Avarua', cc: 'CK', z: 'Pacific/Rarotonga', cap: true },
  { c: 'Fakaofo', cc: 'TK', z: 'Pacific/Fakaofo', cap: true },
  { c: 'Funafuti', cc: 'TV', z: 'Pacific/Funafuti', cap: true },
  { c: 'Hagatna', cc: 'GU', z: 'Pacific/Guam', cap: true },
  { c: 'Kingston', cc: 'NF', z: 'Pacific/Norfolk', cap: true },
  { c: 'Majuro', cc: 'MH', z: 'Pacific/Majuro', cap: true },
  { c: 'Mata-Utu', cc: 'WF', z: 'Pacific/Wallis', cap: true },
  { c: 'Ngerulmud', cc: 'PW', z: 'Pacific/Palau', cap: true },
  { c: 'Nukualofa', cc: 'TO', z: 'Pacific/Tongatapu', cap: true },
  { c: 'Pago Pago', cc: 'AS', z: 'Pacific/Pago_Pago', cap: true },
  { c: 'Palikir', cc: 'FM', z: 'Pacific/Ponape', cap: true },
  { c: 'Port Vila', cc: 'VU', z: 'Pacific/Efate', cap: true },
  { c: 'Saipan', cc: 'MP', z: 'Pacific/Saipan', cap: true },
  { c: 'Tarawa', cc: 'KI', z: 'Pacific/Tarawa', cap: true },
  { c: 'Yaren', cc: 'NR', z: 'Pacific/Nauru', cap: true },
  // Arctic
  { c: 'Longyearbyen', cc: 'SJ', z: 'Arctic/Longyearbyen', cap: true },
];

/* ------------------------------------------------------------------ */
/* Country + flag                                                      */
/* ------------------------------------------------------------------ */

let regionNames: Intl.DisplayNames | null = null;

export function countryName(cc: string): string {
  if (!cc) return '';
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/** Flag emoji from an ISO country code, via regional indicator symbols. */
export function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0)));
}

/* ------------------------------------------------------------------ */
/* Offsets and formatting                                              */
/* ------------------------------------------------------------------ */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = partsCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(zone, f);
  }
  return f;
}

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

/** The wall clock reading in `zone` at instant `date`. */
export function wallTimeIn(date: Date, zone: string): WallTime {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(zone).formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some environments render midnight as hour 24 under hour12:false.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

/** Zone's UTC offset in minutes at `date` (east of UTC positive). */
export function offsetMinutes(date: Date, zone: string): number {
  const w = wallTimeIn(date, zone);
  const map: Record<string, string> = {};
  for (const p of partsFormatter(zone).formatToParts(date)) map[p.type] = p.value;
  const asUTC = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, Number(map.second));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Inverse of wallTimeIn: the instant at which `zone` reads this wall time.
 *
 * Intl only converts instant -> wall time, so we guess (treat the reading as
 * UTC), measure the zone's offset at that guess, correct, then measure again.
 * The second pass matters near DST transitions, where the offset at the guess
 * differs from the offset at the corrected instant.
 *
 * Two awkward cases:
 *
 *  - Spring forward. 02:30 simply does not occur on a day the clocks jump from
 *    02:00 to 03:00. The refined result would land back before the transition
 *    (01:30), which reads as the user's input being moved backwards. We instead
 *    keep the first-pass result, which uses the pre-transition offset and so
 *    shifts forward to 03:30 — matching Temporal's "compatible" disambiguation.
 *
 *  - Fall back. 01:30 happens twice. Both are valid; we return the first
 *    (still in daylight time), again matching Temporal's default.
 */
export function wallTimeToInstant(w: WallTime, zone: string): Date {
  const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);

  const firstPass = guess - offsetMinutes(new Date(guess), zone) * 60000;
  const refined = guess - offsetMinutes(new Date(firstPass), zone) * 60000;

  // If the refined instant reads back as the requested wall time, it is right.
  // If it does not, that reading never occurs — we are inside a gap.
  const check = wallTimeIn(new Date(refined), zone);
  const roundTrips =
    check.year === w.year &&
    check.month === w.month &&
    check.day === w.day &&
    check.hour === w.hour &&
    check.minute === w.minute;

  return new Date(roundTrips ? refined : firstPass);
}

/**
 * Long zone names that ICU renders as "GMT+n" in its short form, mapped to the
 * abbreviation people actually use.
 *
 * Keyed on the long name because that already encodes daylight saving —
 * "Australian Eastern Standard Time" and "...Daylight Time" are separate keys,
 * so we do not have to work out whether DST is active.
 *
 * Deliberately incomplete. Deriving initials automatically produces wrong
 * answers (Hong Kong -> "HKST", Bangkok -> "IT") and, worse, ambiguous ones
 * (São Paulo -> "BST", which reads as British Summer Time). Anything not listed
 * here falls back to the GMT offset, which is unambiguous and always correct.
 */
const ZONE_ABBREVIATIONS: Record<string, string> = {
  // Europe. Irish Standard Time is omitted on purpose: its abbreviation is
  // also IST, which already means India Standard Time here.
  'Greenwich Mean Time': 'GMT',
  'British Summer Time': 'BST',
  'Central European Standard Time': 'CET',
  'Central European Summer Time': 'CEST',
  'Eastern European Standard Time': 'EET',
  'Eastern European Summer Time': 'EEST',
  'Western European Standard Time': 'WET',
  'Western European Summer Time': 'WEST',

  'Australian Eastern Standard Time': 'AEST',
  'Australian Eastern Daylight Time': 'AEDT',
  'Australian Central Standard Time': 'ACST',
  'Australian Central Daylight Time': 'ACDT',
  'Australian Western Standard Time': 'AWST',
  'New Zealand Standard Time': 'NZST',
  'New Zealand Daylight Time': 'NZDT',
  'Hong Kong Standard Time': 'HKT',
  'Singapore Standard Time': 'SGT',
  'China Standard Time': 'CST',
  'Japan Standard Time': 'JST',
  'Korean Standard Time': 'KST',
  'India Standard Time': 'IST',
  'Pakistan Standard Time': 'PKT',
  'Nepal Time': 'NPT',
  'Indochina Time': 'ICT',
  'Malaysia Time': 'MYT',
  'Philippine Standard Time': 'PHT',
  'Western Indonesia Time': 'WIB',
  'Central Indonesia Time': 'WITA',
  'Gulf Standard Time': 'GST',
  'Moscow Standard Time': 'MSK',
  'South Africa Standard Time': 'SAST',
  'East Africa Time': 'EAT',
  'West Africa Standard Time': 'WAT',
};

/**
 * Zone abbreviation such as AEST or EDT.
 *
 * ICU gives a real abbreviation for some zones and "GMT+10" for others. We use
 * the abbreviation when offered, consult the table above when not, and
 * otherwise show the GMT offset rather than inventing something plausible.
 */
export function zoneAbbreviation(date: Date, zone: string): string {
  try {
    const short =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';

    if (short && !/^GMT|^UTC/.test(short)) return short;

    const long =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'long' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';

    return ZONE_ABBREVIATIONS[long] ?? short;
  } catch {
    return '';
  }
}

/** "UTC +10", "UTC -4:30", "UTC" */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC ${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** "14 hours behind", "2 hours ahead", "same time" — relative to a reference. */
export function describeDifference(minutes: number): string {
  if (minutes === 0) return 'same time';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} min`);
  return `${parts.join(' ')} ${minutes > 0 ? 'ahead' : 'behind'}`;
}

/* ------------------------------------------------------------------ */
/* Suitability                                                         */
/* ------------------------------------------------------------------ */

export type Suitability = 'good' | 'ok' | 'poor';

/** Rough call on whether an hour is reasonable to put a meeting in. */
export function rateHour(hour: number): Suitability {
  if (hour >= 9 && hour < 18) return 'good';
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 22)) return 'ok';
  return 'poor';
}

export const SUITABILITY_EMOJI: Record<Suitability, string> = {
  good: '🙂',
  ok: '😐',
  poor: '😴',
};

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  city: string;
  cc: string;
  zone: string;
}

let allZones: string[] | null = null;

function zoneList(): string[] {
  if (allZones) return allZones;
  try {
    // @ts-expect-error - supportedValuesOf is newer than the bundled lib types
    allZones = (Intl.supportedValuesOf?.('timeZone') as string[]) ?? [];
  } catch {
    allZones = [];
  }
  return allZones!;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // fold accents so "sao paulo" finds "São Paulo"
    .replace(/[_/]/g, ' ')
    .trim();

/**
 * Names people type that Intl.DisplayNames does not answer to. It returns the
 * official English form, so "turkey" misses Türkiye and "ivory" misses Côte
 * d'Ivoire. Constituent countries are here too: someone typing "scotland"
 * wants Edinburgh, and no ISO code will tell you that.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  GB: ['uk', 'britain', 'great britain', 'england'],
  US: ['usa', 'america', 'united states of america'],
  AE: ['uae'],
  NL: ['holland'],
  TR: ['turkey'],
  MM: ['burma'],
  CI: ['ivory coast'],
  SZ: ['swaziland'],
  CZ: ['czech republic'],
  PS: ['palestine'],
  IR: ['persia'],
  LK: ['ceylon'],
  TL: ['east timor'],
  VA: ['holy see'],
  CD: ['drc', 'democratic republic of the congo', 'zaire'],
  CG: ['republic of the congo'],
  CV: ['cabo verde'],
  MK: ['macedonia'],
  KP: ['dprk'],
  KR: ['republic of korea'],
};

/**
 * Curated cities first (ranked: prefix beats substring), then any remaining
 * IANA zone whose name matches, so obscure zones stay reachable.
 *
 * Country names are matched on substring, not just prefix, because people type
 * the distinctive half: "korea" for South Korea, "emirates" for the UAE. When
 * the match came from the country rather than the city, capitals sort first,
 * so "cyprus" leads with Nicosia instead of whatever is alphabetically first.
 */
export function searchCities(query: string, limit = 8): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const scored: { r: SearchResult; score: number; country: boolean; cap: boolean; i: number }[] =
    [];

  for (const [i, city] of CITIES.entries()) {
    const names = [normalize(city.c), ...(city.alt ?? []).map(normalize)];
    const country = normalize(countryName(city.cc));
    const aliases = COUNTRY_ALIASES[city.cc] ?? [];
    let score = -1;
    let fromCountry = false;

    if (names.some((n) => n === q)) score = 0;
    else if (names.some((n) => n.startsWith(q))) score = 1;
    else if (country === q || aliases.includes(q)) (score = 2), (fromCountry = true);
    // A whole country name beats a fragment buried inside a city name. Without
    // that, "uk" answers Yamoussoukro before the United Kingdom.
    else if (names.some((n) => n.includes(q))) score = 3;
    else if (country.startsWith(q) || aliases.some((a) => a.startsWith(q)))
      (score = 4), (fromCountry = true);
    else if (country.includes(q)) (score = 5), (fromCountry = true);
    else if (normalize(city.z).includes(q)) score = 6;

    if (score >= 0)
      scored.push({
        r: { city: city.c, cc: city.cc, zone: city.z },
        score,
        country: fromCountry,
        cap: city.cap === true,
        i,
      });
  }

  // Ties fall back to position in CITIES, which is ordered by how likely people
  // are to want the place. Alphabetical would answer "korea" with Pyongyang.
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      (a.country ? Number(b.cap) - Number(a.cap) : 0) ||
      a.i - b.i
  );
  const out = scored.slice(0, limit).map((s) => s.r);

  if (out.length < limit) {
    const seen = new Set(out.map((o) => o.zone));
    for (const zone of zoneList()) {
      if (out.length >= limit) break;
      if (seen.has(zone) || !normalize(zone).includes(q)) continue;
      out.push({ city: zone.split('/').pop()!.replace(/_/g, ' '), cc: '', zone });
      seen.add(zone);
    }
  }

  return out;
}

/** The visitor's own zone, for seeding the first row. */
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Best-effort city label for a zone id. */
export function cityForZone(zone: string): SearchResult {
  const match = CITIES.find((c) => c.z === zone);
  if (match) return { city: match.c, cc: match.cc, zone };
  return { city: zone.split('/').pop()!.replace(/_/g, ' '), cc: '', zone };
}
