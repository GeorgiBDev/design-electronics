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
import { Calculator, Download, Info, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HeatSink3D from "./HeatSink3D";

interface HeatSinkInputs {
  ambientTemp: number;
  maxSurfaceTemp: number;
  power: number;
  length: number;
  height: number;
  finThickness: number;
  baseThickness: number;
  emissivity: number;
}

interface HeatSinkResults {
  width: number;
  spacing: number;
  numberOfFins: number;
}

const HeatSinkCalculator = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState<HeatSinkInputs>({
    ambientTemp: 25,
    maxSurfaceTemp: 85,
    power: 10,
    length: 50,
    height: 25,
    finThickness: 2,
    baseThickness: 3,
    emissivity: 0.9,
  });

  const [results, setResults] = useState<HeatSinkResults | null>(null);

  const calculateHeatSink = () => {
    try {
      // Heat sink calculation based on natural convection and radiation
      const deltaT = inputs.maxSurfaceTemp - inputs.ambientTemp;
      const g = 9.81; // gravity
      const nu = 1.5e-5; // kinematic viscosity of air at ~55°C
      const k = 0.027; // thermal conductivity of air at ~55°C
      const Pr = 0.71; // Prandtl number for air
      const beta = 1 / (inputs.ambientTemp + 273.15); // thermal expansion coefficient

      // Geometry in SI
      const H_m = inputs.height / 1000;
      const L_m = inputs.length / 1000;

      if (deltaT <= 0) throw new Error("T_s must exceed T_amb");

      // Rayleigh number for vertical fins
      const Ra = (g * beta * deltaT * H_m ** 3) / (nu * (nu / Pr));

      // Nusselt number for natural convection
      const Nu =
        0.68 +
        (0.67 * Math.pow(Ra, 0.25)) /
          Math.pow(1 + Math.pow(0.492 / Pr, 9 / 16), 4 / 9);

      // Convection heat transfer coefficient
      const h = (Nu * k) / H_m; // W/m²K

      // Optimal fin spacing for maximum heat transfer
      // const spacing = 2.714 * Math.pow(inputs.height / 1000 / Ra, 0.25) * 1000; // convert to mm

      // eq5 from Bar‑Cohen & Rohsenow:
      // const s_opt_m =
      //   Math.pow((2 * nu * nu) / (g * beta * deltaT), 0.25) *
      //   (inputs.height / 1000);

      const k_f = 205; // W/mK (aluminum)
      const s_opt_m =
        2.714 * Math.pow(k_f / (h * H_m), 0.25) * (inputs.height / 1000);

      // back to mm, rounded:
      const spacing = Math.round(s_opt_m * 1000 * 10) / 10;

      // Stefan-Boltzmann constant
      const sigma = 5.67e-8;

      // Surface area calculations
      const baseArea = (inputs.length / 1000) * (inputs.length / 1000); // assuming square base

      // Heat dissipated by convection and radiation per fin
      const finSurfaceArea = 2 * H_m * L_m;
      const qConvectionPerFin = h * finSurfaceArea * deltaT;
      const qRadiationPerFin =
        inputs.emissivity *
        sigma *
        finSurfaceArea *
        (Math.pow(inputs.maxSurfaceTemp + 273.15, 4) -
          Math.pow(inputs.ambientTemp + 273.15, 4));

      const qPerFin = qConvectionPerFin + qRadiationPerFin;

      // Number of fins required
      const numberOfFins = Math.ceil(inputs.power / qPerFin);

      // Total width
      const totalWidth_m =
        numberOfFins * (inputs.finThickness / 1000) +
        (numberOfFins - 1) * s_opt_m;
      const width = Math.round(totalWidth_m * 1000 * 10) / 10;
      // Heat sink width
      // const width =
      //   numberOfFins * inputs.finThickness + (numberOfFins - 1) * spacing;

      setResults({
        width: Math.round(width * 10) / 10,
        spacing: Math.round(spacing * 10) / 10,
        numberOfFins: numberOfFins,
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
  };

  const exportResults = () => {
    if (!results) return;

    const exportData = {
      inputs,
      results,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heat-sink-calculation.json";
    link.click();
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
        <Badge variant="secondary" className="mt-2">
          <Info className="w-3 h-3 mr-1" />
          Natural Convection & Radiation
        </Badge>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ambientTemp">T_amb (°C)</Label>
                <Input
                  id="ambientTemp"
                  type="number"
                  value={inputs.ambientTemp}
                  onChange={(e) =>
                    handleInputChange("ambientTemp", e.target.value)
                  }
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSurfaceTemp">T_s max (°C)</Label>
                <Input
                  id="maxSurfaceTemp"
                  type="number"
                  value={inputs.maxSurfaceTemp}
                  onChange={(e) =>
                    handleInputChange("maxSurfaceTemp", e.target.value)
                  }
                  placeholder="85"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="power">Power (Watts)</Label>
              <Input
                id="power"
                type="number"
                value={inputs.power}
                onChange={(e) => handleInputChange("power", e.target.value)}
                placeholder="10"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  value={inputs.length}
                  onChange={(e) => handleInputChange("length", e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={inputs.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finThickness">Fin Thickness (mm)</Label>
                <Input
                  id="finThickness"
                  type="number"
                  step="0.1"
                  value={inputs.finThickness}
                  onChange={(e) =>
                    handleInputChange("finThickness", e.target.value)
                  }
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseThickness">Base Thickness (mm)</Label>
                <Input
                  id="baseThickness"
                  type="number"
                  step="0.1"
                  value={inputs.baseThickness}
                  onChange={(e) =>
                    handleInputChange("baseThickness", e.target.value)
                  }
                  placeholder="3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emissivity">Surface Emissivity</Label>
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
                placeholder="0.9"
              />
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

                <Button
                  onClick={exportResults}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
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
