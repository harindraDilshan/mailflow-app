"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  CartesianGrid,
} from "recharts";
import {
  Send,
  Users,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Globe,
  Clock,
  Mail,
  ShieldCheck,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { StatCard } from "@/src/components/blocks/stat-card";

interface MarketingDashboardProps {
  totalContacts: number;
  totalCampaigns: number;
  totalDomains: number;
  recentCampaigns: Array<{
    $id: string;
    name: string;
    subject: string;
    status: string;
    $createdAt: string;
  }>;
  recentDomains: Array<{
    $id: string;
    domain: string;
    status: string;
  }>;
}

const deliveryData = [
  { day: "Mon", sent: 1240, delivered: 1225 },
  { day: "Tue", sent: 2480, delivered: 2460 },
  { day: "Wed", sent: 1850, delivered: 1835 },
  { day: "Thu", sent: 3200, delivered: 3180 },
  { day: "Fri", sent: 2900, delivered: 2875 },
  { day: "Sat", sent: 940, delivered: 935 },
  { day: "Sun", sent: 1100, delivered: 1090 },
];

const deliveryChartConfig = {
  sent: {
    label: "Sent",
    color: "var(--chart-2)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const engagementData = [
  { week: "W1", openRate: 38.2, clickRate: 4.8 },
  { week: "W2", openRate: 41.5, clickRate: 5.6 },
  { week: "W3", openRate: 39.8, clickRate: 5.1 },
  { week: "W4", openRate: 44.6, clickRate: 6.8 },
];

const engagementChartConfig = {
  openRate: {
    label: "Open Rate (%)",
    color: "var(--chart-1)",
  },
  clickRate: {
    label: "Click Rate (%)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function MarketingDashboard({
  totalContacts,
  totalCampaigns,
  totalDomains,
  recentCampaigns,
  recentDomains,
}: MarketingDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Email Marketing Overview
          </h1>
          <p className="text-xs text-muted-foreground">
            Deliverability, subscriber engagement, and campaign performance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/contacts/new" />}>
            <Users className="size-3.5" />
            <span>Add Contact</span>
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/domains" />}>
            <Globe className="size-3.5" />
            <span>Domains ({totalDomains})</span>
          </Button>
          <Button size="sm" render={<Link href="/campaigns/new" />}>
            <Plus className="size-3.5" />
            <span>Create Campaign</span>
          </Button>
        </div>
      </div>

      {/* Primary Metric Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Audience"
          value={totalContacts.toLocaleString()}
          delta="+8.4%"
          description="Active subscribers across all lists"
        />
        <StatCard
          title="Campaigns Sent"
          value={totalCampaigns.toString()}
          delta="+12.0%"
          description="Broadcasts and automations launched"
        />
        <StatCard
          title="Avg. Open Rate"
          value="42.8%"
          delta="+3.2%"
          description="Industry benchmark: 38.0%"
        />
        <StatCard
          title="Deliverability Score"
          value="99.4%"
          delta="+0.3%"
          description="Inbox placement & reputation"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Email Delivery Volume */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Delivery Volume</CardTitle>
                <CardDescription>Emails sent vs. successfully delivered this week</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                98.8% inboxed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={deliveryChartConfig} className="h-56 w-full">
              <BarChart data={deliveryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sent" fill="var(--color-sent)" radius={4} />
                <Bar dataKey="delivered" fill="var(--color-delivered)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>Average open and click-through rates over past 4 weeks</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                +4.2% MoM
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={engagementChartConfig} className="h-56 w-full">
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="openRate"
                  stroke="var(--color-openRate)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="clickRate"
                  stroke="var(--color-clickRate)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Recent Campaigns & Deliverability Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Campaigns (2 cols on large screen) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Latest email broadcasts and queue status</CardDescription>
            </div>
            <Button variant="ghost" size="xs" render={<Link href="/campaigns" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                      No campaigns created yet. Click "Create Campaign" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentCampaigns.map((c) => (
                    <TableRow key={c.$id}>
                      <TableCell className="font-medium text-xs">
                        <Link href={`/campaigns/${c.$id}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.subject || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === "sent" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.$createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Deliverability & Sending Health (1 col) */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-foreground" />
                <span>Deliverability Health</span>
              </CardTitle>
              <CardDescription>Authentication status for your sending domains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Active Domains</span>
                <span className="font-mono font-medium text-foreground">{totalDomains}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">SPF / DKIM Status</span>
                <Badge variant="outline" className="text-[10px]">
                  Configured
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">DMARC Policy</span>
                <Badge variant="outline" className="text-[10px]">
                  p=none / monitor
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bounce Rate Threshold</span>
                <span className="font-mono text-muted-foreground">&lt; 1.0% (Clean)</span>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4 border-t border-border">
            <Button variant="outline" size="sm" className="w-full" render={<Link href="/domains" />}>
              Manage Sending Domains
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
