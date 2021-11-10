const docs = {
  "openapi": "3.0.0",
  "info": {
    "title": "Gas Emission API",
    "description": "An API that gives the country wise emission of greenhouse gases for a timeframe of certain years in CO2 equivalent. Customized data can be retrieved by specifying the country, gases and range of time frame for which the data is desired. Each query is cached on the server and subsequent responses will be faster than the first time for a unique-new query.",
    "termsOfService": "https://blueskyhq.in/legal#api-terms",
    "contact": {
      "name": "Vaibhav Chauhan",
      "email": "vaibhav.chauhan.674@gmail.com"
    },
    "license": {
      "name": "BlueSky License",
      "url": "https://blueskyhq.in/legal#api-terms"
    },
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://sheltered-eyrie-76205.herokuapp.com/",
    }
  ],
  "paths": {
    "/countries": {
      "get": {
        "summary": "Gives a start and end year data for all the gases for each country.",
        "description": "This endpoint will give a list containing objects for each countries with country_name, all the gases with their startYear and endYear values along with a message telling about the availability of data for that particular gas. Start and End yaers will be determined based on the earliest and latest data available.",
        "operationId": "countriesGET",
        "responses": {
          "200": {
            "description": "Successful pull of gas data for all the countries along with a message.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/inline_response_200"
                  },
                  "x-content-type": "application/json"
                }
              }
            }
          },
          "500": {
            "description": "Some internal server error occured and couldn't process the request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/inline_response_500"
                }
              }
            }
          }
        },
        "x-swagger-router-controller": "Default"
      }
    },
    "/country/{id}/query": {
      "get": {
        "summary": "Gives the data of the gases mentioned for a specific country(id) for a given range of time frame.",
        "description": "This end point provides the data in the range of years specified (startYear - endYear) for a given set of gases (CO2 and CH4 ...) for a given country (id). If range is not given it will produce entire data for those gases. If a value dosen't exist for a gas for a given time frame, \"NaN\" will be prvided. This api also provides a metaData object in the response which specifies what you requested for and what you are getting along with the completeness of the data being provided. And finally a message for any relevant information.",
        "operationId": "countryIdGET",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "description": "The country name for which data is needed. Casing is not strict, but spaces are mandatory if any in the country name. e.g :-   \"United Kingdom\"",
            "required": true,
            "style": "simple",
            "explode": false,
            "schema": {
              "type": "string",
              "example": "Australia"
            }
          },
          {
            "name": "gas",
            "in": "query",
            "description": "Name of one or more gases for which data is required seperate with \" and \". Casing is not strict but the whitespaces are.",
            "required": true,
            "style": "form",
            "explode": true,
            "schema": {
              "type": "string",
              "example": "CO2 and CH4"
            }
          },
          {
            "name": "startYear",
            "in": "query",
            "description": "Start year from which the data is required, if not given a default value of the earliest year available in the dataset will be considered.",
            "required": false,
            "style": "form",
            "explode": true,
            "schema": {
              "type": "integer",
              "example": 1995
            }
          },
          {
            "name": "endYear",
            "in": "query",
            "description": "End year from which the data is required, if not given a default value of the latest year available in the dataset will be considered.",
            "required": false,
            "style": "form",
            "explode": true,
            "schema": {
              "type": "integer",
              "example": 2013
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful fetch of the required data from startYear to endYear for the given set of gases for a particular country.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/inline_response_200_1"
                }
              }
            }
          },
          "400": {
            "description": "This response is send when query is malformed. It can be a required parameter missing or startYear is smaller than endYear or any other misstake in the query.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/inline_response_400"
                }
              }
            }
          },
          "404": {
            "description": "Data not found for a country or a set of gases in the dataset. If any one of the gases provided in the gas parameter is not in the dataset it will throw this response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/inline_response_404"
                }
              }
            }
          },
          "500": {
            "description": "Some internal error occured and couldn't process the request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/inline_response_500"
                }
              }
            }
          }
        },
        "x-swagger-router-controller": "Default"
      }
    }
  },
  "components": {
    "schemas": {
      "inline_response_200": {
        "properties": {
          "name": {
            "type": "string",
            "example": "Australia"
          },
          "gas_name_1": {
            "type": "object",
            "example": {
              "startYear": 1990,
              "endYear": 2014,
              "message": "Data available"
            }
          },
          "gas_name_n": {
            "type": "object",
            "example": {
              "startYear": "Nan",
              "endYear": "NaN",
              "message": "Data unavailable"
            }
          },
          "gas_name_m": {
            "type": "object",
            "example": {
              "startYear": 2001,
              "endYear": 2014,
              "message": "Data available"
            }
          }
        },
        "example": {
          "gas_name_n": {
            "startYear": "Nan",
            "endYear": "NaN",
            "message": "Data unavailable"
          },
          "gas_name_1": {
            "startYear": 1990,
            "endYear": 2014,
            "message": "Data available"
          },
          "name": "Australia",
          "gas_name_m": {
            "startYear": 2001,
            "endYear": 2014,
            "message": "Data available"
          }
        }
      },
      "inline_response_500": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "Internal Server Error."
          }
        }
      },
      "inline_response_200_1": {
        "type": "object",
        "properties": {
          "countryName": {
            "type": "string",
            "example": "Finland"
          },
          "CO2": {
            "type": "object",
            "example": {
              "1990": 23.343,
              "1991": 23.211
            }
          },
          "CH4": {
            "type": "object",
            "example": {
              "1990": 13.343,
              "1991": 12.211
            }
          },
          "message": {
            "type": "string",
            "example": "Data available only from 1990 to 2014"
          },
          "metaData": {
            "type": "object",
            "description": "Contains information about the data that is being returned.",
            "example": {
              "requestedFromYear": 1986,
              "requestedToYear": 1992,
              "providingFromYear": 1990,
              "providingToYear": 1992,
              "requestedFor": [
                "CO2",
                "CH4"
              ],
              "providingDataStatus": "Complete"
            }
          }
        },
        "example": {
          "metaData": {
            "requestedFromYear": 1986,
            "requestedToYear": 1992,
            "providingFromYear": 1990,
            "providingToYear": 1992,
            "requestedFor": [
              "CO2",
              "CH4"
            ],
            "providingDataStatus": "Complete"
          },
          "CO2": {
            "1990": 23.343,
            "1991": 23.211
          },
          "countryName": "Finland",
          "message": "Data available only from 1990 to 2014",
          "CH4": {
            "1990": 13.343,
            "1991": 12.211
          }
        }
      },
      "inline_response_400": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "Incomplete query"
          }
        }
      },
      "inline_response_404": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "example": "Data unavailable for country Tanzania"
          }
        }
      }
    }
  }
}

export default docs