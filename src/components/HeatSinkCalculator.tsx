import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Download,
  Info,
  Eye,
  FileSpreadsheet,
  Wrench,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import HeatSink3D from "./HeatSink3D";
import AIAdvisor from "./AIAdvisor";
import { TooltipPortal } from "@radix-ui/react-tooltip";

interface Material {
  name: string;
  thermalConductivity: number; // W/m·K
  emissivity: number;
  density: number; // kg/m³
  specificHeat: number; // J/kg·K
}

interface HeatSinkInputs {
  ambientTemp: number;
  maxSurfaceTemp: number;
  power: number;
  length: number;
  height: number;
  finThickness: number;
  baseThickness: number;
  emissivity: number;
  material: string;
  convectionType: "natural" | "forced";
  airVelocity?: number; // m/s for forced convection
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity: "info" | "warning" | "error";
}

interface HeatSinkResults {
  width: number;
  spacing: number;
  numberOfFins: number;
}

const HeatSinkCalculator = () => {
  const { toast } = useToast();

  const materials: Material[] = [
    {
      name: "Aluminum 6061",
      thermalConductivity: 167,
      emissivity: 0.82,
      density: 2700,
      specificHeat: 896,
    },
    {
      name: "Aluminum 1050",
      thermalConductivity: 229,
      emissivity: 0.09,
      density: 2705,
      specificHeat: 904,
    },
    {
      name: "Copper",
      thermalConductivity: 401,
      emissivity: 0.04,
      density: 8960,
      specificHeat: 385,
    },
    {
      name: "Brass",
      thermalConductivity: 109,
      emissivity: 0.61,
      density: 8530,
      specificHeat: 380,
    },
    {
      name: "Steel (Carbon)",
      thermalConductivity: 45,
      emissivity: 0.8,
      density: 7850,
      specificHeat: 490,
    },
    {
      name: "Titanium",
      thermalConductivity: 22,
      emissivity: 0.63,
      density: 4500,
      specificHeat: 523,
    },
  ];

  const [inputs, setInputs] = useState<HeatSinkInputs>({
    ambientTemp: 25,
    maxSurfaceTemp: 85,
    power: 10,
    length: 50,
    height: 25,
    finThickness: 2,
    baseThickness: 3,
    emissivity: 0.82,
    material: "Aluminum 6061",
    convectionType: "natural",
    airVelocity: 1.0,
  });

  const [results, setResults] = useState<HeatSinkResults | null>(null);
  const [validationResults, setValidationResults] = useState<{
    [key: string]: ValidationResult;
  }>({});

  const validateInput = (
    field: keyof HeatSinkInputs,
    value: number
  ): ValidationResult => {
    switch (field) {
      case "ambientTemp":
        if (value < -40 || value > 60) {
          return {
            isValid: false,
            message:
              "Ambient temperature should be between -40°C and 60°C for typical applications",
            severity: "warning",
          };
        }
        if (value >= inputs.maxSurfaceTemp) {
          return {
            isValid: false,
            message:
              "Ambient temperature must be lower than maximum surface temperature",
            severity: "error",
          };
        }
        return { isValid: true, severity: "info" };

      case "maxSurfaceTemp":
        if (value < 0 || value > 200) {
          return {
            isValid: false,
            message:
              "Surface temperature should be between 0°C and 200°C for safe operation",
            severity: "warning",
          };
        }
        if (value <= inputs.ambientTemp) {
          return {
            isValid: false,
            message:
              "Surface temperature must be higher than ambient temperature",
            severity: "error",
          };
        }
        return { isValid: true, severity: "info" };

      case "power":
        if (value <= 0) {
          return {
            isValid: false,
            message: "Power must be greater than 0W",
            severity: "error",
          };
        }
        if (value > 1000) {
          return {
            isValid: false,
            message:
              "Power above 1000W may require forced convection or liquid cooling",
            severity: "warning",
          };
        }
        return { isValid: true, severity: "info" };

      case "emissivity":
        if (value < 0 || value > 1) {
          return {
            isValid: false,
            message: "Emissivity must be between 0 and 1",
            severity: "error",
          };
        }
        if (value < 0.1) {
          return {
            isValid: false,
            message:
              "Very low emissivity - consider surface treatment for better radiation",
            severity: "warning",
          };
        }
        return { isValid: true, severity: "info" };

      case "length":
      case "height":
        if (value <= 0) {
          return {
            isValid: false,
            message: "Dimension must be greater than 0mm",
            severity: "error",
          };
        }
        if (value > 500) {
          return {
            isValid: false,
            message: "Large dimensions may affect calculation accuracy",
            severity: "warning",
          };
        }
        return { isValid: true, severity: "info" };

      case "finThickness":
        if (value <= 0) {
          return {
            isValid: false,
            message: "Fin thickness must be greater than 0mm",
            severity: "error",
          };
        }
        if (value < 1) {
          return {
            isValid: false,
            message: "Very thin fins may be difficult to manufacture",
            severity: "warning",
          };
        }
        if (value > 10) {
          return {
            isValid: false,
            message: "Thick fins reduce surface area efficiency",
            severity: "warning",
          };
        }
        return { isValid: true, severity: "info" };

      case "baseThickness":
        if (value <= 0) {
          return {
            isValid: false,
            message: "Base thickness must be greater than 0mm",
            severity: "error",
          };
        }
        if (value < 2) {
          return {
            isValid: false,
            message: "Thin base may cause high thermal resistance",
            severity: "warning",
          };
        }
        return { isValid: true, severity: "info" };

      case "airVelocity":
        if (inputs.convectionType === "forced") {
          if (value <= 0) {
            return {
              isValid: false,
              message:
                "Air velocity must be greater than 0 m/s for forced convection",
              severity: "error",
            };
          }
          if (value > 50) {
            return {
              isValid: false,
              message: "Very high air velocity - check fan specifications",
              severity: "warning",
            };
          }
        }
        return { isValid: true, severity: "info" };

      default:
        return { isValid: true, severity: "info" };
    }
  };

  const validateAllInputs = (): boolean => {
    const validations: { [key: string]: ValidationResult } = {};

    Object.keys(inputs).forEach((key) => {
      const field = key as keyof HeatSinkInputs;
      if (typeof inputs[field] === "number") {
        validations[field] = validateInput(field, inputs[field] as number);
      }
    });

    setValidationResults(validations);

    return !Object.values(validations).some(
      (v) => !v.isValid && v.severity === "error"
    );
  };

  const calculateHeatSink = () => {
    if (!validateAllInputs()) {
      toast({
        title: "Validation Error",
        description:
          "Please fix the input validation errors before calculating.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Heat sink calculation based on natural/forced convection and radiation
      const deltaT = inputs.maxSurfaceTemp - inputs.ambientTemp;
      const Ts = inputs.maxSurfaceTemp + 273.15; // Convert to Kelvin
      const Tamb = inputs.ambientTemp + 273.15; // Convert to Kelvin
      const Tavg = (Ts + Tamb) / 2; // Average temperature in Kelvin

      // Air properties at average temperature (approximations for typical conditions)
      const g = 9.81; // gravity m/s²
      const beta = 1 / Tavg; // thermal expansion coefficient 1/K
      const nu = 1.568e-5; // kinematic viscosity of air m²/s
      const alpha = 2.2e-5; // thermal diffusivity of air m²/s
      const k = 0.0263; // thermal conductivity of air W/m·K
      const sigma = 5.67e-8; // Stefan-Boltzmann constant

      // Convert dimensions to meters for calculations
      const L = inputs.length / 1000; // length in meters
      const H = inputs.height / 1000; // height in meters
      const t = inputs.finThickness / 1000; // thickness in meters
      const b = inputs.baseThickness / 1000; // base thickness in meters

      // Calculate optimal fin spacing (Equation 5 from the article)
      const sopt =
        2.71 * Math.pow((g * beta * deltaT) / (L * alpha * nu), -0.25);
      const spacing = sopt * 1000; // convert to mm

      // Calculate heat transfer coefficients based on convection type
      let h1, h2;

      if (inputs.convectionType === "natural") {
        // h1 for external surfaces (Equation 3) - Natural convection
        h1 = 1.42 * Math.pow(deltaT / L, 0.25);

        // h2 for surfaces between fins (Equation 7) - Natural convection
        h2 = (1.31 * k) / sopt;
        // forced
      } else {
        const Re = ((inputs.airVelocity || 1.0) * L) / nu; // Reynolds number
        const Pr = nu / alpha; // Prandtl number

        // External surfaces - forced convection over flat plate
        h1 = (k / L) * 0.664 * Math.pow(Re, 0.5) * Math.pow(Pr, 0.33);

        // Internal surfaces - forced convection through channels
        const Dh = (4 * sopt * H) / (2 * (sopt + H)); // Hydraulic diameter
        const ReChannel = ((inputs.airVelocity || 1.0) * Dh) / nu;
        h2 = (k / Dh) * 0.023 * Math.pow(ReChannel, 0.8) * Math.pow(Pr, 0.4);
      }

      // Calculate surface areas
      // A1: External side surfaces (Equation 2)
      const A1 = H * L + t * (2 * H + L);

      // A2: Internal fin surfaces (Equation 4)
      const A2 = L * (2 * (H - b) + sopt) + 2 * (t * H + sopt * b) + t * L;

      // Apparent radiation area A_r2 (Equation 11)
      const Ar2 = L * (t + sopt) + 2 * (t * H + sopt * b);

      // Calculate heat dissipation from external surfaces
      // Convection from A1 (Equation 1)
      const Qc1 = 2 * h1 * A1 * deltaT;

      // Radiation from A1 (Equation 9)
      const Qr1 =
        2 *
        inputs.emissivity *
        sigma *
        A1 *
        (Math.pow(Ts, 4) - Math.pow(Tamb, 4));

      // Heat dissipation per fin (internal surfaces)
      // Convection from A2 (Equation 8)
      const Qc2 = h2 * A2 * deltaT;

      // Radiation from A2 (Equation 10)
      const Qr2 =
        inputs.emissivity * sigma * Ar2 * (Math.pow(Ts, 4) - Math.pow(Tamb, 4));

      // Calculate number of fins (Equation 12)
      const numberOfFins = Math.max(
        1,
        Math.ceil(1 + (inputs.power - Qr1 - Qc1) / (Qr2 + Qc2))
      );

      // Calculate heat sink width (Equation 13)
      const width =
        (numberOfFins - 1) * spacing + numberOfFins * inputs.finThickness;

      setResults({
        width: Math.round(width * 10) / 10,
        spacing: Math.round(spacing * 10) / 10,
        numberOfFins,
      });

      toast({
        title: "Calculation Complete",
        description: "Heat sink dimensions calculated successfully!",
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Please check your input values and try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof HeatSinkInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));

    // Validate input in real-time
    const validation = validateInput(field, numValue);
    setValidationResults((prev) => ({ ...prev, [field]: validation }));
  };

  const handleMaterialChange = (materialName: string) => {
    const selectedMaterial = materials.find((m) => m.name === materialName);
    if (selectedMaterial) {
      setInputs((prev) => ({
        ...prev,
        material: materialName,
        emissivity: selectedMaterial.emissivity,
      }));
    }
  };

  const exportToCSV = () => {
    if (!results) return;

    // Calculate detailed thermal values for CSV
    const deltaT = inputs.maxSurfaceTemp - inputs.ambientTemp;
    const Ts = inputs.maxSurfaceTemp + 273.15;
    const Tamb = inputs.ambientTemp + 273.15;
    const Tavg = (Ts + Tamb) / 2;

    const g = 9.81;
    const beta = 1 / Tavg;
    const nu = 1.568e-5;
    const alpha = 2.2e-5;
    const k = 0.0263;
    const sigma = 5.67e-8;

    const L = inputs.length / 1000;
    const H = inputs.height / 1000;
    const t = inputs.finThickness / 1000;
    const b = inputs.baseThickness / 1000;

    const sopt = 2.71 * Math.pow((g * beta * deltaT) / (L * alpha * nu), -0.25);
    const h1 = 1.42 * Math.pow(deltaT / L, 0.25);
    const h2 = (1.31 * k) / sopt;

    const A1 = H * L + t * (2 * H + L);
    const A2 = L * (2 * (H - b) + sopt) + 2 * (t * H + sopt * b) + t * L;
    const Ar2 = L * (t + sopt) + 2 * (t * H + sopt * b);

    const Qc1 = 2 * h1 * A1 * deltaT;
    const Qr1 =
      2 *
      inputs.emissivity *
      sigma *
      A1 *
      (Math.pow(Ts, 4) - Math.pow(Tamb, 4));
    const Qc2 = h2 * A2 * deltaT;
    const Qr2 =
      inputs.emissivity * sigma * Ar2 * (Math.pow(Ts, 4) - Math.pow(Tamb, 4));

    const selectedMaterial = materials.find((m) => m.name === inputs.material);

    const csvData = [
      ["Heat Sink Calculation Report", ""],
      ["Timestamp", new Date().toISOString()],
      ["", ""],
      ["INPUT PARAMETERS", ""],
      ["Ambient Temperature (°C)", inputs.ambientTemp],
      ["Max Surface Temperature (°C)", inputs.maxSurfaceTemp],
      ["Power Dissipation (W)", inputs.power],
      ["Length (mm)", inputs.length],
      ["Height (mm)", inputs.height],
      ["Fin Thickness (mm)", inputs.finThickness],
      ["Base Thickness (mm)", inputs.baseThickness],
      ["Material", inputs.material],
      [
        "Thermal Conductivity (W/m·K)",
        selectedMaterial?.thermalConductivity || "N/A",
      ],
      ["Material Density (kg/m³)", selectedMaterial?.density || "N/A"],
      ["Specific Heat (J/kg·K)", selectedMaterial?.specificHeat || "N/A"],
      ["Surface Emissivity", inputs.emissivity],
      ["", ""],
      ["CALCULATED RESULTS", ""],
      ["Heat Sink Width (mm)", results.width],
      ["Fin Spacing (mm)", results.spacing],
      ["Number of Fins", results.numberOfFins],
      ["", ""],
      ["DETAILED CALCULATIONS", ""],
      ["Temperature Difference (°C)", deltaT],
      ["Surface Temperature (K)", Ts],
      ["Ambient Temperature (K)", Tamb],
      ["Average Temperature (K)", Tavg],
      ["Optimal Spacing (m)", sopt],
      ["External Heat Transfer Coefficient (W/m²·K)", h1],
      ["Internal Heat Transfer Coefficient (W/m²·K)", h2],
      ["External Surface Area (m²)", A1],
      ["Internal Surface Area (m²)", A2],
      ["Radiation Area (m²)", Ar2],
      ["External Convection Heat Transfer (W)", Qc1],
      ["External Radiation Heat Transfer (W)", Qr1],
      ["Internal Convection Heat Transfer (W)", Qc2],
      ["Internal Radiation Heat Transfer (W)", Qr2],
      [
        "Total Heat Dissipation (W)",
        Qc1 + Qr1 + (results.numberOfFins - 1) * (Qc2 + Qr2),
      ],
    ];

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `heat-sink-calculations-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: "Detailed calculations exported successfully!",
    });
  };

  const exportToCAD = () => {
    if (!results) return;

    const selectedMaterial = materials.find((m) => m.name === inputs.material);

    // CAD-ready JSON with complete geometry and material data
    const cadData = {
      metadata: {
        title: "Heat Sink Design",
        software: "Thermal Design Calculator",
        version: "1.0",
        timestamp: new Date().toISOString(),
        units: {
          length: "mm",
          temperature: "°C",
          power: "W",
          thermalConductivity: "W/m·K",
        },
      },
      design: {
        type: "heat_sink_finned",
        application: "natural_convection",
        geometry: {
          overall: {
            length: inputs.length,
            width: results.width,
            height: inputs.height,
            volume: (inputs.length * results.width * inputs.height) / 1000, // cm³
          },
          base: {
            length: inputs.length,
            width: results.width,
            thickness: inputs.baseThickness,
          },
          fins: {
            count: results.numberOfFins,
            thickness: inputs.finThickness,
            height: inputs.height - inputs.baseThickness,
            spacing: results.spacing,
            length: inputs.length,
          },
        },
        material: {
          name: inputs.material,
          properties: selectedMaterial
            ? {
                thermalConductivity: selectedMaterial.thermalConductivity,
                density: selectedMaterial.density,
                specificHeat: selectedMaterial.specificHeat,
                emissivity: selectedMaterial.emissivity,
              }
            : undefined,
        },
        thermal: {
          ambientTemperature: inputs.ambientTemp,
          maxSurfaceTemperature: inputs.maxSurfaceTemp,
          powerDissipation: inputs.power,
          surfaceEmissivity: inputs.emissivity,
        },
      },
      manufacturing: {
        processes: ["machining", "extrusion", "casting"],
        tolerances: {
          general: "±0.1mm",
          finSpacing: "±0.05mm",
          finThickness: "±0.02mm",
        },
        surfaceFinish: {
          recommended: "Ra 1.6 μm",
          notes: "Anodized finish recommended for improved emissivity",
        },
      },
      cad_features: {
        coordinate_system: "origin_at_base_corner",
        base_sketch: {
          rectangle: {
            width: results.width,
            length: inputs.length,
          },
        },
        fins: Array.from({ length: results.numberOfFins }, (_, i) => ({
          fin_number: i + 1,
          position_x:
            i * (inputs.finThickness + results.spacing) +
            inputs.finThickness / 2,
          dimensions: {
            thickness: inputs.finThickness,
            height: inputs.height - inputs.baseThickness,
            length: inputs.length,
          },
        })),
        extrude_operations: {
          base: {
            height: inputs.baseThickness,
            operation: "add",
          },
          fins: {
            height: inputs.height - inputs.baseThickness,
            operation: "add",
            pattern: "linear_array",
          },
        },
      },
    };

    const dataStr = JSON.stringify(cadData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `heat-sink-cad-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CAD File Exported",
      description: "CAD-ready JSON exported for SolidWorks/Fusion360!",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-technical-gray">
          Heat Sink Size Calculator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Calculate optimal heat sink dimensions for natural convection and
          radiation cooling. This calculator determines fin spacing, heat sink
          width, and number of fins required.
        </p>
        <div className="flex justify-center gap-2 mt-2">
          <Badge variant="secondary">
            <Info className="w-3 h-3 mr-1" />
            {inputs.convectionType === "natural"
              ? "Natural Convection & Radiation"
              : "Forced Convection & Radiation"}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Need Help?
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  This calculator uses validated engineering correlations for
                  heat transfer analysis. Natural convection for passive
                  cooling, forced convection for fan-assisted cooling.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Input Parameters
            </CardTitle>
            <CardDescription>
              Enter the thermal and geometric parameters for your heat sink
              design.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Convection Type</Label>
              <Select
                value={inputs.convectionType}
                onValueChange={(value: "natural" | "forced") =>
                  setInputs((prev) => ({ ...prev, convectionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="natural"
                    className="relative overflow-visible"
                  >
                    <div className="flex items-center gap-2">
                      <span>Natural Convection</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent className="z-50">
                              <p className="max-w-xs">
                                Passive cooling by air circulation due to
                                temperature differences
                              </p>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="forced"
                    className="relative overflow-visible"
                  >
                    <div className="flex items-center gap-2">
                      <span>Forced Convection</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent className="z-50">
                              <p className="max-w-xs">
                                Active cooling using fans or blowers for air
                                circulation
                              </p>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inputs.convectionType === "forced" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="airVelocity">Air Velocity (m/s)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Typical values: 1-5 m/s for small fans, 5-15 m/s for
                          industrial applications
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="airVelocity"
                  type="number"
                  step="0.1"
                  value={inputs.airVelocity || 1.0}
                  onChange={(e) =>
                    handleInputChange("airVelocity", e.target.value)
                  }
                  placeholder="1.0"
                  className={
                    validationResults.airVelocity &&
                    !validationResults.airVelocity.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.airVelocity &&
                  !validationResults.airVelocity.isValid && (
                    <Alert
                      variant={
                        validationResults.airVelocity.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.airVelocity.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ambientTemp">T_amb (°C)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Ambient air temperature. Typical range: -40°C to 60°C
                          for electronic applications
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="ambientTemp"
                  type="number"
                  value={inputs.ambientTemp}
                  onChange={(e) =>
                    handleInputChange("ambientTemp", e.target.value)
                  }
                  placeholder="25"
                  className={
                    validationResults.ambientTemp &&
                    !validationResults.ambientTemp.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.ambientTemp &&
                  !validationResults.ambientTemp.isValid && (
                    <Alert
                      variant={
                        validationResults.ambientTemp.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.ambientTemp.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxSurfaceTemp">T_s max (°C)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Maximum allowable surface temperature. Must be higher
                          than ambient temperature
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="maxSurfaceTemp"
                  type="number"
                  value={inputs.maxSurfaceTemp}
                  onChange={(e) =>
                    handleInputChange("maxSurfaceTemp", e.target.value)
                  }
                  placeholder="85"
                  className={
                    validationResults.maxSurfaceTemp &&
                    !validationResults.maxSurfaceTemp.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.maxSurfaceTemp &&
                  !validationResults.maxSurfaceTemp.isValid && (
                    <Alert
                      variant={
                        validationResults.maxSurfaceTemp.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.maxSurfaceTemp.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="power">Power (Watts)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Heat dissipation power. Formula: P = V × I (electrical)
                        or thermal power to be dissipated
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="power"
                type="number"
                value={inputs.power}
                onChange={(e) => handleInputChange("power", e.target.value)}
                placeholder="10"
                className={
                  validationResults.power && !validationResults.power.isValid
                    ? "border-destructive"
                    : ""
                }
              />
              {validationResults.power && !validationResults.power.isValid && (
                <Alert
                  variant={
                    validationResults.power.severity === "error"
                      ? "destructive"
                      : "default"
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {validationResults.power.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="length">Length (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Heat sink length in flow direction. Affects heat
                          transfer coefficient calculation.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="length"
                  type="number"
                  value={inputs.length}
                  onChange={(e) => handleInputChange("length", e.target.value)}
                  placeholder="50"
                  className={
                    validationResults.length &&
                    !validationResults.length.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.length &&
                  !validationResults.length.isValid && (
                    <Alert
                      variant={
                        validationResults.length.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.length.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="height">Height (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Total heat sink height including base. Taller fins
                          provide more surface area.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="height"
                  type="number"
                  value={inputs.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  placeholder="25"
                  className={
                    validationResults.height &&
                    !validationResults.height.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.height &&
                  !validationResults.height.isValid && (
                    <Alert
                      variant={
                        validationResults.height.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.height.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="finThickness">Fin Thickness (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Individual fin thickness. Thinner fins provide more
                          surface area but may be harder to manufacture.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="finThickness"
                  type="number"
                  step="0.1"
                  value={inputs.finThickness}
                  onChange={(e) =>
                    handleInputChange("finThickness", e.target.value)
                  }
                  placeholder="2"
                  className={
                    validationResults.finThickness &&
                    !validationResults.finThickness.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.finThickness &&
                  !validationResults.finThickness.isValid && (
                    <Alert
                      variant={
                        validationResults.finThickness.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.finThickness.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="baseThickness">Base Thickness (mm)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Base plate thickness. Thicker base reduces thermal
                          resistance but adds weight.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="baseThickness"
                  type="number"
                  step="0.1"
                  value={inputs.baseThickness}
                  onChange={(e) =>
                    handleInputChange("baseThickness", e.target.value)
                  }
                  placeholder="3"
                  className={
                    validationResults.baseThickness &&
                    !validationResults.baseThickness.isValid
                      ? "border-destructive"
                      : ""
                  }
                />
                {validationResults.baseThickness &&
                  !validationResults.baseThickness.isValid && (
                    <Alert
                      variant={
                        validationResults.baseThickness.severity === "error"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {validationResults.baseThickness.message}
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="material">Material</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Material affects thermal conductivity and emissivity.
                        Higher thermal conductivity improves heat conduction.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={inputs.material}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.name} value={material.name}>
                      <div className="flex flex-col">
                        <span>{material.name}</span>
                        <span className="text-xs text-muted-foreground">
                          k={material.thermalConductivity} W/m·K, ε=
                          {material.emissivity}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="emissivity">Surface Emissivity</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ExternalLink className="w-3 h-3 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Surface emissivity for radiation heat transfer (0-1).
                        Higher values improve radiation cooling.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="emissivity"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={inputs.emissivity}
                onChange={(e) =>
                  handleInputChange("emissivity", e.target.value)
                }
                placeholder="0.82"
                className={
                  validationResults.emissivity &&
                  !validationResults.emissivity.isValid
                    ? "border-destructive"
                    : ""
                }
              />
              {validationResults.emissivity &&
                !validationResults.emissivity.isValid && (
                  <Alert
                    variant={
                      validationResults.emissivity.severity === "error"
                        ? "destructive"
                        : "default"
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {validationResults.emissivity.message}
                    </AlertDescription>
                  </Alert>
                )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Reference values:</strong>
                </p>
                <p>• Anodized aluminum: ~0.82</p>
                <p>• Raw aluminum: ~0.09</p>
                <p>• Black oxidized: ~0.95</p>
                <p>• Polished metals: 0.02-0.10</p>
              </div>
            </div>

            <Button
              onClick={calculateHeatSink}
              className="w-full bg-gradient-to-r from-primary to-technical-blue hover:from-primary/90 hover:to-technical-blue/90"
              size="lg"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Heat Sink
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              3D Visualization & Results
            </CardTitle>
            <CardDescription>
              Interactive 3D model showing your calculated heat sink design.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {results ? (
              <>
                {/* 3D Visualization */}
                <div className="h-[400px] w-full">
                  <HeatSink3D
                    width={results.width}
                    length={inputs.length}
                    height={inputs.height}
                    finThickness={inputs.finThickness}
                    baseThickness={inputs.baseThickness}
                    numberOfFins={results.numberOfFins}
                    spacing={results.spacing}
                  />
                </div>

                {/* Results Grid */}
                <div className="grid gap-4">
                  <div className="bg-accent p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Heat Sink Width
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {results.width} mm
                      </span>
                    </div>
                  </div>

                  <div className="bg-accent p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Fin Spacing
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {results.spacing} mm
                      </span>
                    </div>
                  </div>

                  <div className="bg-accent p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Number of Fins
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {results.numberOfFins}
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Export Results
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export CSV/XLS
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToCAD}>
                      <Wrench className="w-4 h-4 mr-2" />
                      Export CAD JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Click "Calculate Heat Sink" to see 3D visualization</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-technical-blue-light border-technical-blue/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-technical-gray">Important Note</p>
              <p className="text-sm text-muted-foreground">
                This calculator assumes the heat source covers the entire base
                of the heat sink and uses natural convection and radiation heat
                transfer. For concentrated heat sources much smaller than the
                heat sink base, consider specialized thermal analysis tools.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeatSinkCalculator;
