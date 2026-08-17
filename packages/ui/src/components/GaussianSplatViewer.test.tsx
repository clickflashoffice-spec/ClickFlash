// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { GaussianSplatViewer } from './GaussianSplatViewer';
import type { GaussianSplatJob } from '@clickflash/types';

describe('GaussianSplatViewer', () => {
  const mockJob: GaussianSplatJob = {
    id: 'splat-job-12345',
    photoIds: ['p1', 'p2', 'p3'],
    sceneId: 'roller-coaster-drop-cam-01',
    quality: 'cinematic_6dof',
    format: 'splat',
    status: 'completed',
    splatUrl: 'https://cdn.clickflash.com/splats/3d/splat-job-12345.splat',
    thumbnailUrl: 'https://cdn.clickflash.com/splats/3d/thumb_splat-job-12345.png',
    splatCount: 1_200_000,
    fileSizeBytes: 48_000_000,
    renderFpsEstimate: 60,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('renders the 3D Gaussian Splat viewer with scene metadata and telemetry HUD', () => {
    render(<GaussianSplatViewer job={mockJob} />);

    expect(screen.getByText('✨ 6-DoF Gaussian Splat')).toBeInTheDocument();
    expect(screen.getByText('Scene: roller-coaster-drop-cam-01')).toBeInTheDocument();
    expect(screen.getByText('cinematic_6dof')).toBeInTheDocument();
    expect(screen.getByText('1,200,000')).toBeInTheDocument();
    expect(screen.getByText('45.8 MB')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('toggles orbit rotation state when auto orbit button is clicked', () => {
    render(<GaussianSplatViewer job={mockJob} />);

    const orbitButton = screen.getByRole('button', { name: /▶ Auto Orbit/i });
    expect(orbitButton).toBeInTheDocument();

    fireEvent.click(orbitButton);
    expect(screen.getByRole('button', { name: /⏸ Stop Orbit/i })).toBeInTheDocument();
  });

  it('updates viewpoint coordinates and triggers callback on preset click', () => {
    const handleViewpointChange = vi.fn();
    render(<GaussianSplatViewer job={mockJob} onViewpointChange={handleViewpointChange} />);

    const topDownPreset = screen.getByRole('button', { name: /TOP DOWN/i });
    fireEvent.click(topDownPreset);

    expect(handleViewpointChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pitch: -88,
        yaw: 0,
        y: 5.0
      })
    );

    const ridePerspectivePreset = screen.getByRole('button', { name: /RIDE PERSPECTIVE/i });
    fireEvent.click(ridePerspectivePreset);

    expect(handleViewpointChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pitch: -5,
        yaw: 10
      })
    );
  });
});
