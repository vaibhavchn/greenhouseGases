import Data from './Data';

csvCleaning = () => {


  const countries = [
    "Australia",
    "Austria",
    "Belarus",
    "Belgium",
    "Bulgaria",
    "Canada",
    "Croatia",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Estonia",
    "European Union",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Iceland",
    "Ireland",
    "Italy",
    "Japan",
    "Latvia",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Malta",
    "Monaco",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Poland",
    "Portugal",
    "Romania",
    "Russian Federation",
    "Slovakia",
    "Slovenia",
    "Spain",
    "Sweden",
    "Switzerland",
    "Turkey",
    "Ukraine",
    "United Kingdom",
    "United States of America",
  ]

  const categories = [
    'CO2',
    'GHGSCO2',
    'GHGS',
    'HFCS',
    'CH4',
    'NF3',
    'NO2',
    'PFCS',
    'SF6',
    'HFCPFC',
  ]

  const years = [
    '1990',
    '1991',
    '1992',
    '1993',
    '1994',
    '1995',
    '1996',
    '1997',
    '1998',
    '1999',
    '2000',
    '2001',
    '2002',
    '2003',
    '2004',
    '2005',
    '2006',
    '2007',
    '2008',
    '2009',
    '2010',
    '2011',
    '2012',
    '2013',
    '2014',
  ]

  var finalData = {}


  Data.forEach(element => {
      switch (element.category) {
        case 'carbon_dioxide_co2_emissions_without_land_use_land_use_change_and_forestry_lulucf_in_kilotonne_co2_equivalent':
          element.category = "CO2";
          break;

        case 'greenhouse_gas_ghgs_emissions_including_indirect_co2_without_lulucf_in_kilotonne_co2_equivalent':
          element.category = "GHGSCO2";
          break;

        case 'greenhouse_gas_ghgs_emissions_without_land_use_land_use_change_and_forestry_lulucf_in_kilotonne_co2_equivalent':
          element.category = "GHGS";
          break;

        case 'hydrofluorocarbons_hfcs_emissions_in_kilotonne_co2_equivalent':
          element.category = "HFCS";
          break;

        case 'methane_ch4_emissions_without_land_use_land_use_change_and_forestry_lulucf_in_kilotonne_co2_equivalent':
          element.category = "CH4";
          break;

        case 'nitrogen_trifluoride_nf3_emissions_in_kilotonne_co2_equivalent':
          element.category = "NF3";
          break;

        case 'nitrous_oxide_n2o_emissions_without_land_use_land_use_change_and_forestry_lulucf_in_kilotonne_co2_equivalent':
          element.category = "NO2";
          break;

        case 'perfluorocarbons_pfcs_emissions_in_kilotonne_co2_equivalent':
          element.category = "PFCS";
          break;

        case 'sulphur_hexafluoride_sf6_emissions_in_kilotonne_co2_equivalent':
          element.category = "SF6";
          break;

        case 'unspecified_mix_of_hydrofluorocarbons_hfcs_and_perfluorocarbons_pfcs_emissions_in_kilotonne_co2_equivalent':
          element.category = "HFCPFC";
          break;
      
        default:
          break;
      }
      element.value = Math.round(element.value * 1000) / 1000

      if (finalData[element.country_or_area] === undefined){
        finalData[element.country_or_area] = {}
        finalData[element.country_or_area][element.category] = {}
          finalData[element.country_or_area][element.category][element.year] = element.value
      }
      if (finalData[element.country_or_area] !== undefined && finalData[element.country_or_area][element.category] === undefined){
        finalData[element.country_or_area][element.category] = {}
        finalData[element.country_or_area][element.category][element.year] = element.value
      }
      if(finalData[element.country_or_area] !== undefined && finalData[element.country_or_area][element.category] !== undefined){
        finalData[element.country_or_area][element.category][element.year] = element.value
      }
    })

    countries.forEach(country => {
      categories.forEach(category => {
        if(finalData[country][category] === undefined){
            finalData[country][category] = {}
          }
        years.forEach(year  => {
          if(finalData[country][category][year] === undefined){
            finalData[country][category][year] = 'NaN'
          }
        })
      })
    })
    countries.forEach(country => {
      firestore.collection('Pollution').doc(country).set(
        finalData[country],
      )
    })
  }
