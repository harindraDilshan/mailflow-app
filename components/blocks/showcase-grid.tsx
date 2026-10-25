"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  MoreHorizontal,
  Info,
  Calendar as CalendarIcon,
  Check,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { StatCard } from "@/src/components/blocks/stat-card";
import { ChatInputBlock } from "@/src/components/blocks/chat-input-block";
import { EmptyStateBlock } from "@/src/components/blocks/empty-state-block";
import { placeholders } from "@/src/lib/placeholders";

const barChartData = [
  { item: placeholders.item1, value: 180, secondary: 120 },
  { item: placeholders.item2, value: 290, secondary: 170 },
  { item: placeholders.item3, value: 220, secondary: 240 },
  { item: placeholders.item4, value: 90, secondary: 70 },
  { item: placeholders.item5, value: 210, secondary: 160 },
];

const barChartConfig = {
  value: {
    label: placeholders.item1,
    color: "var(--chart-1)",
  },
  secondary: {
    label: placeholders.item2,
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const lineChartData = [
  { item: placeholders.item1, value: 45, secondary: 25 },
  { item: placeholders.item2, value: 80, secondary: 55 },
  { item: placeholders.item3, value: 65, secondary: 70 },
  { item: placeholders.item4, value: 120, secondary: 90 },
  { item: placeholders.item5, value: 140, secondary: 110 },
];

const lineChartConfig = {
  value: {
    label: placeholders.item1,
    color: "var(--chart-2)",
  },
  secondary: {
    label: placeholders.item2,
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function ShowcaseGrid() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [sliderVal, setSliderVal] = React.useState<number[]>([45]);
  const [switchVal, setSwitchVal] = React.useState<boolean>(true);
  const [checkboxVal, setCheckboxVal] = React.useState<boolean>(true);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={placeholders.statCard.title}
          value="1,280"
          delta="+12.5%"
          description={placeholders.statCard.description}
        />
        <StatCard
          title={placeholders.statCard.title}
          value="84.2%"
          delta="+4.1%"
          description={placeholders.statCard.description}
        />
        <StatCard
          title={placeholders.statCard.title}
          value="24"
          delta="-1.8%"
          description={placeholders.statCard.description}
        />
        <StatCard
          title={placeholders.statCard.title}
          value={placeholders.currency}
          delta="+0.0%"
          description={placeholders.statCard.description}
        />
      </div>

      {/* Responsive Masonry-style Grid */}
      <div className="columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
        {/* 1. Buttons Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default">{placeholders.buttons.default}</Button>
              <Button variant="secondary">{placeholders.buttons.secondary}</Button>
              <Button variant="outline">{placeholders.buttons.outline}</Button>
              <Button variant="ghost">{placeholders.buttons.ghost}</Button>
              <Button variant="destructive">{placeholders.buttons.destructive}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <Button size="xs">{placeholders.button}</Button>
              <Button size="sm">{placeholders.button}</Button>
              <Button size="default">{placeholders.button}</Button>
              <Button size="lg">{placeholders.button}</Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Badges & Avatars */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{placeholders.badge}</Badge>
              <Badge variant="secondary">{placeholders.badgeSecondary}</Badge>
              <Badge variant="outline">{placeholders.badgeOutline}</Badge>
              <Badge variant="destructive">{placeholders.badgeDestructive}</Badge>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Avatar size="sm">
                <AvatarFallback>01</AvatarFallback>
              </Avatar>
              <Avatar size="default">
                <AvatarFallback>02</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarFallback>03</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>

        {/* 3. Grayscale Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-52 w-full">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="item" tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                <Bar dataKey="secondary" fill="var(--color-secondary)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 4. Grayscale Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineChartConfig} className="h-52 w-full">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="item" tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="secondary"
                  stroke="var(--color-secondary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 5. Form with Labels */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.form.title}</CardTitle>
            <CardDescription>{placeholders.form.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {placeholders.form.nameLabel}
              </label>
              <Input placeholder={placeholders.form.namePlaceholder} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {placeholders.form.emailLabel}
              </label>
              <Input type="email" placeholder={placeholders.form.emailPlaceholder} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {placeholders.form.selectLabel}
              </label>
              <Select defaultValue="1">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={placeholders.form.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{placeholders.item1}</SelectItem>
                  <SelectItem value="2">{placeholders.item2}</SelectItem>
                  <SelectItem value="3">{placeholders.item3}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {placeholders.form.textareaLabel}
              </label>
              <Textarea placeholder={placeholders.form.textareaPlaceholder} />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button size="sm" className="w-full">
              {placeholders.form.submit}
            </Button>
          </CardFooter>
        </Card>

        {/* 6. Controls (Switch, Checkbox, Slider, Progress) */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {placeholders.form.switchLabel}
              </span>
              <Switch checked={switchVal} onCheckedChange={setSwitchVal} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={checkboxVal}
                onCheckedChange={(checked) => setCheckboxVal(checked === true)}
                id="check-1"
              />
              <label htmlFor="check-1" className="text-xs font-medium text-foreground cursor-pointer">
                {placeholders.form.checkboxLabel}
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{placeholders.form.sliderLabel}</span>
                <span className="font-mono text-muted-foreground">{sliderVal[0]}%</span>
              </div>
              <Slider
                value={sliderVal}
                onValueChange={(val) => setSliderVal(val as number[])}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{placeholders.label}</span>
                <span className="font-mono text-muted-foreground">65%</span>
              </div>
              <Progress value={65} />
            </div>
          </CardContent>
        </Card>

        {/* 7. Tabs & Tooltip */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="tab1">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="tab1">{placeholders.tabs.tab1}</TabsTrigger>
                <TabsTrigger value="tab2">{placeholders.tabs.tab2}</TabsTrigger>
                <TabsTrigger value="tab3">{placeholders.tabs.tab3}</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="p-3 border border-border rounded-md mt-2">
                <p className="text-xs text-muted-foreground">{placeholders.description} 1</p>
              </TabsContent>
              <TabsContent value="tab2" className="p-3 border border-border rounded-md mt-2">
                <p className="text-xs text-muted-foreground">{placeholders.description} 2</p>
              </TabsContent>
              <TabsContent value="tab3" className="p-3 border border-border rounded-md mt-2">
                <p className="text-xs text-muted-foreground">{placeholders.description} 3</p>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">{placeholders.label}:</span>
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="xs" />}>
                  <Info className="size-3.5" />
                  <span>{placeholders.button}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{placeholders.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* 8. Dialogs & Menus */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Dialog */}
              <Dialog>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  {placeholders.dialog.title}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{placeholders.dialog.title}</DialogTitle>
                    <DialogDescription>{placeholders.dialog.description}</DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <Input placeholder={placeholders.name} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm">
                      {placeholders.dialog.cancel}
                    </Button>
                    <Button size="sm">{placeholders.dialog.confirm}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Alert Dialog */}
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                  {placeholders.alertDialog.title}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{placeholders.alertDialog.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {placeholders.alertDialog.description}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{placeholders.alertDialog.cancel}</AlertDialogCancel>
                    <AlertDialogAction>{placeholders.alertDialog.confirm}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>{placeholders.actions}</DropdownMenuLabel>
                  <DropdownMenuItem>{placeholders.item1}</DropdownMenuItem>
                  <DropdownMenuItem>{placeholders.item2}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">{placeholders.delete}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* 9. Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border border-border"
            />
          </CardContent>
        </Card>

        {/* 10. Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {placeholders.table.headers.map((h: string, i: number) => (
                    <TableHead key={i} className="text-xs">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((rowIdx) => (
                  <TableRow key={rowIdx}>
                    <TableCell className="font-medium text-xs">
                      {placeholders.table.row.name} {rowIdx}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      email{rowIdx}@example.com
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {placeholders.table.row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {placeholders.table.row.value}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="xs">
                        {placeholders.table.row.action}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 11. Chat Input Block */}
        <div>
          <ChatInputBlock />
        </div>

        {/* 12. Empty State Block */}
        <div>
          <EmptyStateBlock />
        </div>

        {/* 13. Skeleton & Toast */}
        <Card>
          <CardHeader>
            <CardTitle>{placeholders.title}</CardTitle>
            <CardDescription>{placeholders.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{placeholders.label}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast(placeholders.title, {
                    description: placeholders.description,
                  })
                }
              >
                {placeholders.button}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
